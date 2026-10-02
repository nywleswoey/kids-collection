import type { ChildStore } from "./child-store";
import type { CollectionStore } from "./collection-store";
import type { ClaimStore } from "./claim-store";

type Lease = { fence: number };

interface ClaimRow {
  childId: string;
  status: "granting" | "done";
  fence: number;
  spentBalance: number | null;
  outcome: unknown;
  claimedAtMs: number;
}

/**
 * In-memory ClaimStore — delegates the actual spend/refund/grant side effects
 * to the SAME ChildStore/CollectionStore fakes the rest of a test observes
 * (mirroring the pg adapter, which spends/grants against the same
 * `children`/`collections` tables it claims against), and keeps its own map
 * for the "pull_claims" bookkeeping: fence-guarded ownership and
 * staleness-gated takeover. `now` is injectable so tests can simulate a stale
 * claim without sleeping. See claim-store.ts for why this is exercised
 * through pull-service.ts's own tests rather than a standalone contract.
 */
export function inMemoryClaimStore(
  children: ChildStore,
  collections: CollectionStore,
  now: () => number = () => Date.now(),
): ClaimStore {
  const claims = new Map<string, ClaimRow>();

  const own = (requestId: string, lease: unknown): ClaimRow | null => {
    const row = claims.get(requestId);
    if (!row) return null;
    if (row.status !== "granting") return null;
    if (row.fence !== (lease as Lease).fence) return null;
    return row;
  };

  return {
    async claimAndSpend(requestId, childId) {
      if (claims.has(requestId)) return { kind: "duplicate" };
      claims.set(requestId, {
        childId,
        status: "granting",
        fence: 1,
        spentBalance: null,
        outcome: null,
        claimedAtMs: now(),
      });
      const newBalance = await children.spendOne(childId, "pullTokens");
      if (newBalance === null) {
        const row = claims.get(requestId)!;
        row.status = "done";
        row.outcome = { outOfTokens: true };
        return { kind: "out_of_tokens" };
      }
      claims.get(requestId)!.spentBalance = newBalance;
      return { kind: "fresh", lease: { fence: 1 } satisfies Lease, newBalance };
    },

    async read(requestId) {
      const row = claims.get(requestId);
      if (!row) return null;
      return { childId: row.childId, status: row.status, outcome: row.outcome };
    },

    async takeOverIfStale(requestId, staleMs) {
      const row = claims.get(requestId);
      if (!row || row.status !== "granting") return null;
      if (now() - row.claimedAtMs < staleMs) return null;
      row.fence += 1;
      row.claimedAtMs = now();
      return { lease: { fence: row.fence } satisfies Lease, spentBalance: row.spentBalance! };
    },

    async finishWithCardGrant(lease, requestId, childId, cardId, cardJson, newBalance) {
      const row = own(requestId, lease);
      if (!row) return null;
      const { count } = await collections.grantCard(childId, cardId);
      const outcome = { outOfTokens: false, card: cardJson, isDuplicate: count > 1, newBalance };
      row.status = "done";
      row.outcome = outcome;
      return outcome;
    },

    async finishWithRefund(lease, requestId, childId, outcome) {
      const row = own(requestId, lease);
      if (!row) return false;
      await children.incrementColumn(childId, "pullTokens", 1);
      row.status = "done";
      row.outcome = outcome;
      return true;
    },

    async cleanupFailure(lease, requestId, childId) {
      const row = own(requestId, lease);
      if (!row) return;
      await children.incrementColumn(childId, "pullTokens", 1);
      claims.delete(requestId);
    },

    async sweepAbandoned(childId, staleMs, excludeRequestId) {
      let swept = 0;
      for (const [id, row] of claims.entries()) {
        if (id === excludeRequestId) continue;
        if (row.childId !== childId || row.status !== "granting") continue;
        if (now() - row.claimedAtMs < staleMs) continue;
        row.status = "done";
        row.fence += 1;
        row.claimedAtMs = now();
        row.outcome = { outOfTokens: true };
        swept += 1;
      }
      if (swept > 0) await children.incrementColumn(childId, "pullTokens", swept);
      return swept;
    },
  };
}
