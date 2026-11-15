import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { ClaimStore } from "./claim-store";

type Lease = { fence: number };

/**
 * Postgres adapter for ClaimStore. Every method is ONE statement (neon-http
 * has no interactive transactions — see collection-store.pg.ts `swapCards`):
 * each uses chained CTEs so the ownership check, the side effect (spend,
 * grant, refund) and the status/outcome write commit together or not at all.
 * The `own` lease check locks the claim row (`FOR UPDATE`), so a concurrent
 * takeover or sweep that bumps the fence makes this statement re-check
 * against the new fence and touch nothing.
 */
export const pgClaimStore: ClaimStore = {
  async claimAndSpend(requestId, childId, count = 1) {
    // Postgres CTEs cannot see a sibling CTE's write to the SAME table within
    // one statement (confirmed directly: an UPDATE gated on `EXISTS(insert_cte)`
    // matches zero rows even though the insert just committed its row) — so
    // `pull_claims` is written to exactly ONCE here. `bal` is a plain read,
    // `FOR UPDATE` to lock `children` for the whole statement so its value
    // can't drift before `spend`'s own guarded decrement, which is what makes
    // the claim row's `spent_balance` (computed from `bal`) agree
    // with `spend`'s actual result. See src/features/pull/pull-service.ts.
    //
    // `count` (mass draw, #kcmassdraw) is a single pull's 1 generalized to a
    // pack's 5/10: one claim row still represents ONE whole request, spending
    // `count` tokens together. `outcome` is seeded with a transient
    // `{packSize: count}` marker (instead of NULL) so a later sweep/cleanup
    // can refund the right number of tokens for THIS claim without a new
    // column — `pull_claims` is schema-frozen for this feature (AGENTS.md).
    // It's fully overwritten once the claim finishes (finishWithCardGrant /
    // finishWithPackGrant), so it's never visible once `status = 'done'`.
    const result = await db.execute<{
      claimed: boolean;
      had_tokens: boolean | null;
      new_balance: number | null;
    }>(sql`
      WITH bal AS (
        SELECT pull_tokens FROM children WHERE id = ${childId} FOR UPDATE
      ),
      claim AS (
        INSERT INTO pull_claims (request_id, child_id, status, fence, spent_balance, outcome, claimed_at)
        SELECT ${requestId}::text, ${childId}::text, 'granting', 1, pull_tokens - ${count}, jsonb_build_object('packSize', ${count}::int), now()
        FROM bal WHERE pull_tokens >= ${count}
        ON CONFLICT (request_id) DO NOTHING
        RETURNING request_id
      ),
      spend AS (
        UPDATE children SET pull_tokens = pull_tokens - ${count}
        WHERE id = ${childId} AND EXISTS (SELECT 1 FROM claim) AND (SELECT pull_tokens FROM bal) >= ${count}
        RETURNING pull_tokens AS new_balance
      )
      SELECT
        (SELECT request_id FROM claim) IS NOT NULL AS claimed,
        (SELECT pull_tokens FROM bal) >= ${count} AS had_tokens,
        (SELECT new_balance FROM spend) AS new_balance
    `);
    const row = result.rows[0];
    if (!row.had_tokens) return { kind: "out_of_tokens" };
    if (!row.claimed || row.new_balance === null) return { kind: "duplicate" };
    return { kind: "fresh", lease: { fence: 1 } satisfies Lease, newBalance: row.new_balance };
  },

  async read(requestId) {
    const result = await db.execute<{
      child_id: string;
      status: "granting" | "done";
      outcome: unknown;
    }>(sql`SELECT child_id, status, outcome FROM pull_claims WHERE request_id = ${requestId}`);
    const row = result.rows[0];
    if (!row) return null;
    return { childId: row.child_id, status: row.status, outcome: row.outcome };
  },

  async takeOverIfStale(requestId, staleMs) {
    const result = await db.execute<{ fence: number; spent_balance: number | null; pack_size: number }>(sql`
      UPDATE pull_claims
      SET fence = fence + 1, claimed_at = now()
      WHERE request_id = ${requestId}
        AND status = 'granting'
        AND claimed_at < now() - (${staleMs}::double precision * interval '1 millisecond')
      RETURNING fence, spent_balance, COALESCE((outcome->>'packSize')::int, 1) AS pack_size
    `);
    const row = result.rows[0];
    if (!row || row.spent_balance === null) return null;
    return { lease: { fence: row.fence } satisfies Lease, spentBalance: row.spent_balance, packSize: row.pack_size };
  },

  async finishWithCardGrant(lease, requestId, childId, cardId, cardJson, newBalance) {
    const { fence } = lease as Lease;
    const result = await db.execute<{ outcome: unknown }>(sql`
      WITH own AS (
        SELECT 1 FROM pull_claims WHERE request_id = ${requestId} AND status = 'granting' AND fence = ${fence}
        FOR UPDATE
      ),
      grant_card AS (
        INSERT INTO collections (child_id, card_id, count)
        SELECT ${childId}, ${cardId}, 1 FROM own
        ON CONFLICT (child_id, card_id) DO UPDATE SET count = collections.count + 1
        RETURNING count
      )
      UPDATE pull_claims
      SET status = 'done',
          outcome = jsonb_build_object(
            'outOfTokens', false,
            'card', ${JSON.stringify(cardJson)}::jsonb,
            'isDuplicate', (SELECT count FROM grant_card) > 1,
            'newBalance', ${newBalance}::integer
          )
      WHERE request_id = ${requestId} AND fence = ${fence} AND EXISTS (SELECT 1 FROM grant_card)
      RETURNING outcome
    `);
    return result.rows[0]?.outcome ?? null;
  },

  async finishWithPackGrant(lease, requestId, childId, cards, newBalance) {
    const { fence } = lease as Lease;
    // One jsonb payload (not parallel typed arrays) carries the whole pack
    // across the wire — `jsonb_array_elements ... WITH ORDINALITY` unpacks it
    // back into (card_id, card_json, ord) rows inside the statement. `agg`
    // GROUP BYs by card_id BEFORE the upsert, so a pack that repeats a card
    // (e.g. two commons in a 5-pack) still issues exactly ONE `collections`
    // row touch per distinct card — the fix for Postgres's "ON CONFLICT
    // affects the same row twice in one statement" error a naive per-slot
    // upsert would hit. `final_slots` then recovers each slot's own
    // isDuplicate from the grant's post-upsert total (`grant_cards.count`)
    // minus this pack's own contribution (`agg.pack_count`) plus this slot's
    // occurrence number within the pack (`occ`) — so the pack's first copy of
    // a never-before-owned card isn't a duplicate, but its second copy within
    // the SAME pack is, exactly mirroring finishWithCardGrant's single-card
    // `count > 1` check, generalized to N.
    const payload = cards.map((c) => ({ cardId: c.cardId, card: c.cardJson }));
    const result = await db.execute<{ outcome: unknown }>(sql`
      WITH own AS (
        SELECT 1 FROM pull_claims WHERE request_id = ${requestId} AND status = 'granting' AND fence = ${fence}
        FOR UPDATE
      ),
      slots AS (
        SELECT
          elem->>'cardId' AS card_id,
          elem->'card' AS card_json,
          ord,
          row_number() OVER (PARTITION BY elem->>'cardId' ORDER BY ord) AS occ
        FROM own, jsonb_array_elements(${JSON.stringify(payload)}::jsonb) WITH ORDINALITY AS t(elem, ord)
      ),
      agg AS (
        SELECT card_id, count(*) AS pack_count FROM slots GROUP BY card_id
      ),
      grant_cards AS (
        INSERT INTO collections (child_id, card_id, count)
        SELECT ${childId}, agg.card_id, agg.pack_count FROM agg
        ON CONFLICT (child_id, card_id) DO UPDATE SET count = collections.count + EXCLUDED.count
        RETURNING card_id, count
      ),
      final_slots AS (
        SELECT
          slots.ord,
          slots.card_json,
          (grant_cards.count - agg.pack_count + slots.occ) > 1 AS is_duplicate
        FROM slots
        JOIN agg ON agg.card_id = slots.card_id
        JOIN grant_cards ON grant_cards.card_id = slots.card_id
      )
      UPDATE pull_claims
      SET status = 'done',
          outcome = jsonb_build_object(
            'outOfTokens', false,
            'cards', (
              SELECT coalesce(jsonb_agg(jsonb_build_object('card', card_json, 'isDuplicate', is_duplicate) ORDER BY ord), '[]'::jsonb)
              FROM final_slots
            ),
            'newBalance', ${newBalance}::integer
          )
      WHERE request_id = ${requestId} AND fence = ${fence} AND EXISTS (SELECT 1 FROM grant_cards)
      RETURNING outcome
    `);
    return result.rows[0]?.outcome ?? null;
  },

  async finishWithRefund(lease, requestId, childId, outcome) {
    const { fence } = lease as Lease;
    const result = await db.execute<{ done: boolean }>(sql`
      WITH own AS (
        SELECT 1 FROM pull_claims WHERE request_id = ${requestId} AND status = 'granting' AND fence = ${fence}
        FOR UPDATE
      ),
      refund AS (
        UPDATE children SET pull_tokens = pull_tokens + 1
        WHERE id = ${childId} AND EXISTS (SELECT 1 FROM own)
        RETURNING 1
      ),
      mark AS (
        UPDATE pull_claims SET status = 'done', outcome = ${JSON.stringify(outcome)}::jsonb
        WHERE request_id = ${requestId} AND fence = ${fence} AND EXISTS (SELECT 1 FROM refund)
        RETURNING 1
      )
      SELECT (SELECT 1 FROM mark) IS NOT NULL AS done
    `);
    return result.rows[0]?.done ?? false;
  },

  async cleanupFailure(lease, requestId, childId) {
    const { fence } = lease as Lease;
    // `own` also reads back how many tokens THIS claim spent (the transient
    // `packSize` marker claimAndSpend seeded `outcome` with — see its own
    // comment) so a failed pack refunds all N tokens, not just 1.
    // `COALESCE(..., 1)` only matters if `own` has no row at all (lease
    // lost), where `refund`'s EXISTS already makes the value moot.
    await db.execute(sql`
      WITH own AS (
        SELECT COALESCE((outcome->>'packSize')::int, 1) AS n
        FROM pull_claims WHERE request_id = ${requestId} AND status = 'granting' AND fence = ${fence}
        FOR UPDATE
      ),
      refund AS (
        UPDATE children SET pull_tokens = pull_tokens + COALESCE((SELECT n FROM own), 1)
        WHERE id = ${childId} AND EXISTS (SELECT 1 FROM own)
        RETURNING 1
      )
      DELETE FROM pull_claims
      WHERE request_id = ${requestId} AND fence = ${fence} AND EXISTS (SELECT 1 FROM refund)
    `);
  },

  async sweepAbandoned(childId, staleMs, excludeRequestId) {
    // `target` reads each stale claim's own spent count (see claimAndSpend's
    // `packSize` marker) BEFORE `swept` overwrites `outcome` — a sibling CTE's
    // write within one statement is invisible to others, but `target` never
    // writes, so it always sees the pre-sweep value regardless of `swept`'s
    // own ordering. The refund sums every swept claim's actual spend instead
    // of a flat one-per-claim.
    const result = await db.execute<{ swept: number }>(sql`
      WITH target AS (
        SELECT request_id, COALESCE((outcome->>'packSize')::int, 1) AS n
        FROM pull_claims
        WHERE child_id = ${childId}
          AND request_id != ${excludeRequestId}
          AND status = 'granting'
          AND claimed_at < now() - (${staleMs}::double precision * interval '1 millisecond')
        FOR UPDATE
      ),
      swept AS (
        UPDATE pull_claims
        SET status = 'done', fence = fence + 1, claimed_at = now(), outcome = '{"refunded":true}'::jsonb
        WHERE request_id IN (SELECT request_id FROM target)
        RETURNING 1
      ),
      refund AS (
        UPDATE children SET pull_tokens = pull_tokens + (SELECT COALESCE(SUM(n), 0) FROM target)
        WHERE id = ${childId} AND EXISTS (SELECT 1 FROM swept)
        RETURNING 1
      )
      SELECT (SELECT count(*) FROM target)::int AS swept
    `);
    return Number(result.rows[0]?.swept ?? 0);
  },

  async completedForChild(childId, limit) {
    const result = await db.execute<{ request_id: string; outcome: unknown; created_at: string }>(sql`
      SELECT request_id, outcome, created_at FROM pull_claims
      WHERE child_id = ${childId} AND status = 'done'
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);
    return result.rows.map((r) => ({
      requestId: r.request_id,
      outcome: r.outcome,
      createdAt: new Date(r.created_at),
    }));
  },
};
