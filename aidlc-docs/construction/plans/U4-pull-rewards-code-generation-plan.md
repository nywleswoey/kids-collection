# U4 Pull & Rewards — Code Generation Plan

**Unit**: U4 Pull Engine & Rewards
**Stories**: C1 pull, C2 reveal (handoff), C3 out-of-tokens, C4 duplicates, F1 grant, F2 balance
**Depends on**: U1 (logic/schema), U2 (active child + guard), U3 (pool reader)
**Code at workspace root**; doc summary → `aidlc-docs/construction/U4-pull-rewards/code/`.

## Steps

- [x] **Step 1 — PullService (atomic)**
  `src/features/pull/pull-service.ts` — `pull(childId)`: conditional `UPDATE ... WHERE pull_tokens >= 1 RETURNING` (out-of-tokens if 0 rows) → `drawCard` over `listCards()` → `INSERT ... ON CONFLICT DO UPDATE count+1 RETURNING` → best-effort refund on failure. Returns `PullResult | { outOfTokens: true }`.

- [x] **Step 2 — TokenService**
  `src/features/pull/token-service.ts` — `getBalance(childId)`, `grant(childId, n)` (requireParent, `GREATEST(0, ...)`).

- [x] **Step 3 — Server actions**
  `src/features/pull/actions.ts` — `pullAction()` (resolve active child, call PullService), `grantTokensAction(childId, n)` (requireParent).

- [x] **Step 4 — Pull UI**
  `app/play/pull/page.tsx` (server: active child + balance) + `src/features/pull/PullButton.tsx` (client: calls pullAction, shows result via a temporary card view until U6), `TokenBalance.tsx`, out-of-tokens state. testids per frontend-components.md.

- [x] **Step 5 — Temporary card view**
  `src/features/pull/PullResultView.tsx` — minimal card display + duplicate badge (placeholder; U6 replaces with full effects). Keeps U4 runnable standalone.

- [x] **Step 6 — Wire play home → pull**
  Link `app/play/home` → `/play/pull`; show balance.

- [x] **Step 7 — Tests**
  `tests/pull.int.test.ts` — logic-level tests for out-of-tokens (no spend), duplicate increment, grant non-negative using the pure U1 functions + a fake store; note DB concurrency test to run in Build & Test.

- [x] **Step 8 — Docs**
  `aidlc-docs/construction/U4-pull-rewards/code/summary.md`; README status.

## Story traceability
- C1/C4 → Steps 1,4,5. C3 → Steps 1,4. F1 → Steps 2,3. F2 → Steps 2,4.

## Scope
8 steps, ~9 files. No new deps. C2 reveal + full card effects land in U6.

---
Approve to generate (**/aidlc:approve**), or request changes.
