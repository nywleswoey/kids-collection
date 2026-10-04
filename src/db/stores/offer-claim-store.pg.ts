import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { BalanceColumn } from "./child-store";
import type { OfferClaimStore } from "./offer-claim-store";

/** `BalanceColumn` -> its actual `children` column name (closed, not user input). */
const COLUMN: Record<BalanceColumn, string> = {
  pullTokens: "pull_tokens",
  easterEggTickets: "easter_egg_tickets",
};

/** How long `claimOffer` polls a concurrent duplicate's in-flight phase two
 *  before giving up (ms). The window it's bridging is two back-to-back
 *  statements with no I/O between them — milliseconds in practice — so this
 *  is generous headroom, not a real wait budget. */
const POLL_BUDGET_MS = 2_000;
const POLL_INTERVAL_MS = 20;

/**
 * Postgres adapter for OfferClaimStore. TWO statements per fresh claim — NOT
 * one — because neon-http has no interactive transactions (see
 * collection-store.pg.ts `swapCards`) AND, within one statement, a CTE can't
 * see a SIBLING CTE's write to the SAME table (confirmed directly against a
 * local Postgres: an UPDATE gated on `EXISTS(insert_cte)` into the SAME table
 * the insert just wrote to matches zero rows). Phase one writes
 * `easter_egg_claims` exactly once (the INSERT) and `children` exactly once
 * (the spend); phase two writes it exactly once more (the OUTER UPDATE) and
 * `collections` exactly once — mirroring claim-store.pg.ts's already-proven
 * `claimAndSpend` + `finishWithCardGrant` two-phase shape, just without that store's fence/takeover
 * (nothing here ever needs to steal a stale claim — the ONLY caller who ever
 * runs phase two is the one phase one told "fresh").
 */
export const pgOfferClaimStore: OfferClaimStore = {
  async claimOffer(jti, childId, column, cardId, cardJson) {
    const col = sql.raw(COLUMN[column]);
    const claimed = await db.execute<{
      claimed: boolean;
      new_balance: number | null;
    }>(sql`
      WITH bal AS (
        SELECT ${col} AS spendable FROM children WHERE id = ${childId} FOR UPDATE
      ),
      claim AS (
        INSERT INTO easter_egg_claims (jti, child_id, card_id, status, outcome, created_at)
        SELECT ${jti}::text, ${childId}::text, ${cardId}::text, 'granting', NULL, now()
        FROM bal WHERE bal.spendable >= 1
        ON CONFLICT (jti) DO NOTHING
        RETURNING jti
      ),
      spend AS (
        UPDATE children SET ${col} = ${col} - 1
        WHERE id = ${childId} AND EXISTS (SELECT 1 FROM claim)
        RETURNING pull_tokens AS new_balance
      )
      SELECT
        (SELECT jti FROM claim) IS NOT NULL AS claimed,
        (SELECT new_balance FROM spend) AS new_balance
    `);
    const row = claimed.rows[0];

    if (row.claimed && row.new_balance !== null) {
      const result = await db.execute<{ outcome: unknown }>(sql`
        WITH own AS (
          SELECT 1 FROM easter_egg_claims WHERE jti = ${jti} AND status = 'granting' FOR UPDATE
        ),
        grant_card AS (
          INSERT INTO collections (child_id, card_id, count)
          SELECT ${childId}::text, ${cardId}::text, 1 FROM own
          ON CONFLICT (child_id, card_id) DO UPDATE SET count = collections.count + 1
          RETURNING count
        )
        UPDATE easter_egg_claims
        SET status = 'done',
            outcome = jsonb_build_object(
              'outOfTokens', false,
              'card', ${JSON.stringify(cardJson)}::jsonb,
              'isDuplicate', (SELECT count FROM grant_card) > 1,
              'newBalance', ${row.new_balance}::integer
            )
        WHERE jti = ${jti} AND status = 'granting' AND EXISTS (SELECT 1 FROM grant_card)
        RETURNING outcome
      `);
      const outcome = result.rows[0]?.outcome;
      if (outcome == null) {
        throw new Error(`claimOffer: own fresh claim ${jti} failed to finish`);
      }
      return { replayed: false, outcome };
    }

    // Not freshly claimed: either this jti was already claimed — by an
    // earlier call (reload/retry: its outcome is already "done") or by a
    // concurrent twin mid-flight on phase two (double tap: poll briefly for it
    // to finish rather than surface a brand-new "still in progress" outcome
    // shape to the caller) — or there's no claim row and the balance was 0.
    // The balance alone can't tell these apart: the earlier claim may itself
    // have spent the last ticket.
    const deadline = Date.now() + POLL_BUDGET_MS;
    for (;;) {
      const existing = await db.execute<{ status: string; outcome: unknown }>(
        sql`SELECT status, outcome FROM easter_egg_claims WHERE jti = ${jti}`,
      );
      const existingRow = existing.rows[0];
      if (!existingRow) return { outOfTokens: true };
      if (existingRow.status === "done" && existingRow.outcome != null) {
        return { replayed: true, outcome: existingRow.outcome };
      }
      if (Date.now() >= deadline) {
        throw new Error(`claimOffer: duplicate claim ${jti} never finished (original caller crashed?)`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  },
};
