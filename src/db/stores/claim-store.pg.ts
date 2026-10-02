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
 */
export const pgClaimStore: ClaimStore = {
  async claimAndSpend(requestId, childId) {
    // Postgres CTEs cannot see a sibling CTE's write to the SAME table within
    // one statement (confirmed directly: an UPDATE gated on `EXISTS(insert_cte)`
    // matches zero rows even though the insert just committed its row) — so
    // `pull_claims` is written to exactly ONCE here. `bal` is a plain read,
    // `FOR UPDATE` to lock `children` for the whole statement so its value
    // can't drift before `spend`'s own guarded decrement, which is what makes
    // the claim row's `spent_balance`/`outcome` (computed from `bal`) agree
    // with `spend`'s actual result. See src/features/pull/pull-service.ts.
    const result = await db.execute<{ claimed: boolean; new_balance: number | null }>(sql`
      WITH bal AS (
        SELECT pull_tokens FROM children WHERE id = ${childId} FOR UPDATE
      ),
      claim AS (
        INSERT INTO pull_claims (request_id, child_id, status, fence, spent_balance, outcome, claimed_at)
        VALUES (
          ${requestId}, ${childId},
          CASE WHEN (SELECT pull_tokens FROM bal) >= 1 THEN 'granting' ELSE 'done' END,
          1,
          CASE WHEN (SELECT pull_tokens FROM bal) >= 1 THEN (SELECT pull_tokens FROM bal) - 1 ELSE NULL END,
          CASE WHEN (SELECT pull_tokens FROM bal) >= 1 THEN NULL ELSE '{"outOfTokens":true}'::jsonb END,
          now()
        )
        ON CONFLICT (request_id) DO NOTHING
        RETURNING request_id
      ),
      spend AS (
        UPDATE children SET pull_tokens = pull_tokens - 1
        WHERE id = ${childId} AND EXISTS (SELECT 1 FROM claim) AND (SELECT pull_tokens FROM bal) >= 1
        RETURNING pull_tokens AS new_balance
      )
      SELECT
        (SELECT request_id FROM claim) IS NOT NULL AS claimed,
        (SELECT new_balance FROM spend) AS new_balance
    `);
    const row = result.rows[0];
    if (!row.claimed) return { kind: "duplicate" };
    if (row.new_balance === null) return { kind: "out_of_tokens" };
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
    const result = await db.execute<{ fence: number; spent_balance: number | null }>(sql`
      UPDATE pull_claims
      SET fence = fence + 1, claimed_at = now()
      WHERE request_id = ${requestId}
        AND status = 'granting'
        AND claimed_at < now() - (${staleMs}::double precision * interval '1 millisecond')
      RETURNING fence, spent_balance
    `);
    const row = result.rows[0];
    if (!row || row.spent_balance === null) return null;
    return { lease: { fence: row.fence } satisfies Lease, spentBalance: row.spent_balance };
  },

  async finishWithCardGrant(lease, requestId, childId, cardId, cardJson, newBalance) {
    const { fence } = lease as Lease;
    const result = await db.execute<{ outcome: unknown }>(sql`
      WITH own AS (
        SELECT 1 FROM pull_claims WHERE request_id = ${requestId} AND status = 'granting' AND fence = ${fence}
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
      WHERE request_id = ${requestId} AND EXISTS (SELECT 1 FROM grant_card)
      RETURNING outcome
    `);
    return result.rows[0]?.outcome ?? null;
  },

  async finishWithRefund(lease, requestId, childId, outcome) {
    const { fence } = lease as Lease;
    const result = await db.execute<{ done: boolean }>(sql`
      WITH own AS (
        SELECT 1 FROM pull_claims WHERE request_id = ${requestId} AND status = 'granting' AND fence = ${fence}
      ),
      refund AS (
        UPDATE children SET pull_tokens = pull_tokens + 1
        WHERE id = ${childId} AND EXISTS (SELECT 1 FROM own)
        RETURNING 1
      ),
      mark AS (
        UPDATE pull_claims SET status = 'done', outcome = ${JSON.stringify(outcome)}::jsonb
        WHERE request_id = ${requestId} AND EXISTS (SELECT 1 FROM refund)
        RETURNING 1
      )
      SELECT (SELECT 1 FROM mark) IS NOT NULL AS done
    `);
    return result.rows[0]?.done ?? false;
  },

  async cleanupFailure(lease, requestId, childId) {
    const { fence } = lease as Lease;
    await db.execute(sql`
      WITH own AS (
        SELECT 1 FROM pull_claims WHERE request_id = ${requestId} AND status = 'granting' AND fence = ${fence}
      ),
      refund AS (
        UPDATE children SET pull_tokens = pull_tokens + 1
        WHERE id = ${childId} AND EXISTS (SELECT 1 FROM own)
        RETURNING 1
      )
      DELETE FROM pull_claims
      WHERE request_id = ${requestId} AND EXISTS (SELECT 1 FROM refund)
    `);
  },
};
