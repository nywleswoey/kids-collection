# Architecture deepening candidates

Surfaced 2026-07-19 from an architecture review (vocabulary: `/codebase-design` —
module, interface, depth, seam, adapter, leverage, locality).

**Framing.** The last 43 commits were one deduplication spree. It left the codebase
inverted: the pure, shallow helpers are fully property-tested, while the deep
orchestration (services) — where every cited bug has actually lived — is untested,
because services create their `db` dependency instead of accepting it. Structuring
the code here means *deepening around testability*, not extracting more helpers.

| # | Candidate | Strength | Status |
|---|-----------|----------|--------|
| 1 | Store seam under the services | Strong | **Designed — ready to implement** |
| 2 | Collapse the signed-token cluster | Strong | Open |
| 3 | One action wrapper, not five | Worth exploring | Open |
| 4 | Make the auth decision visible | Worth exploring | Open |
| 5 | Reverse the shallow extractions | Worth exploring | Open |

---

## 1 · Put a Store seam under the services — **Strong**

**Files.** `db/index.ts`, `db/collection-reads.ts`, `db/collection-writes.ts`,
`db/child-reads.ts`, `pull/pull-service.ts`, `trade/trade-service.ts`,
`quiz/quiz-service.ts`, `rewards/service.ts`.

**Problem.** Every service `import { db }` from the `server-only` singleton and
inlines raw Drizzle — no injection seam, so the deep orchestration can't be imported
into a unit test. `pull.model.test.ts` re-implements the CAS spend as a local mirror
because the real one is unreachable. Persistence is fragmented inconsistently:
`collections` got wrapper files, but `children` writes are inlined raw in
`pull-service`/`token-service`.

**Solution.** Services accept a `Store` (accept dependencies, don't create them).
Absorb the `collection-reads/-writes/child-reads` fragments plus the scattered inline
`children` writes. Two adapters: pg in prod, in-memory fake in tests.

**Wins.** Interface becomes the test surface · two adapters justify the seam ·
locality: transactional bugs concentrate · absorbs 3 fragment files · deepest code
stops being mirror-modelled.

### Design (grilled 2026-07-19)

- **Boundary.** Persistence + pool reads move behind injected ports.
  `import "server-only"` sinks to the pg adapter only. `requireParent()` rises to
  the action layer (out of `token-service`/`sacrifice`). `env.authSecret` +
  `makeOffer`/`verifyOffer` crypto stays as direct imports (pure, already tested).
- **Shape — deep domain-op ports** (one method per atomic unit; transactions never
  cross the seam):
  - `CollectionStore`: `grantCard`, `removeCard`, `swapCards` (whole 4-write batch,
    all-or-nothing), `ownedCounts`, `cardCount`, `tradableDuplicates`
  - `ChildStore`: `spendOne → number|null`, `incrementColumn`, `clampedGrant`,
    `balances`
  - `RewardStore`, `QuizStore`, read-only `Catalog` (pool)
- **Split.** Per-aggregate ports — no atomic op spans two tables (`pull` spends +
  grants in separate round-trips; `swapCards` is collections-only), so the split is
  free. A service accepts only the ports it touches. Reward cascade stays
  service-level orchestration, not a store method.
- **Injection.** Factory per feature — `makeTradeService(deps)` returns the function
  cluster; prod singleton wired once; tests construct with fakes.
- **Honesty.** One shared `Store` **contract suite** (property-based over
  spend/grant/swap sequences) runs against the in-memory fake in Vitest AND the pg
  adapter in Build & Test. Retires `pull.model.test.ts` — its local CAS mirror
  becomes the fake, and the contract suite proves the fake matches Postgres.
- **Sequence — tracer bullet.** `trade` first (collections-only, one port, hardest
  atomicity contract): land `CollectionStore` + both adapters + contract suite +
  `makeTradeService` end-to-end → then `pull` (four ports) → `token-service` /
  `quiz` / `rewards`. Mixed interim state tolerated: unconverted callers keep
  importing `addCardCopy`/`removeCardCopy`, which become the pg adapter's internals.

**Contracts the fake must honour** (= the ports' interface invariants):
`spendOne` returns `null` iff the guard fails, never negative · `clampedGrant`
floors at 0 (`GREATEST(0, …)`) · `swapCards` — see the follow-up below; today it is
NOT truly all-or-nothing.

### Follow-up bug — `swapCards` partial-apply on a race (found 2026-07-19)

`executeTrade` calls `removeCardCopy(childId, cardId)` with the default
`minHeld = count + 1 = 2`, so each give is guarded `count >= 2`. On a race where a
side's duplicate was traded away between `validateTrade` and the commit, that side
now holds 1 → the guarded remove **matches zero rows and silently no-ops** (no
`CHECK` violation, no rollback), while the other three writes still apply. Result: a
lopsided trade where a child keeps a card *and* receives the counterparty's. The
`CHECK(count >= 1)` "backstop" the code comments describe is **dead on this path** —
the `gte` guard (added generically for sacrifice) pre-empts it.

Decision (2026-07-19): the tracer **preserves this behaviour faithfully** — the
`swapCards` contract and both adapters encode the partial-apply, with a test
documenting it (`swapCards partial-applies when one side is not a duplicate`). Fixing
it is a separate behaviour change: make the trade give truly all-or-nothing (drop the
guard so `1 → 0` hits `CHECK` and rolls the batch back, or use an interactive
transaction with a pre-check). Natural to land once `pull`/`sacrifice` are also
behind the seam. **Status: open — behaviour-change follow-up.**

### Tracer progress

**Slice 1 — `trade` (done):**
- [x] `CollectionStore` port + pg adapter + in-memory fake
- [x] Shared contract suite (runs against the fake; pg run deferred to Build & Test)
- [x] `trade-service` converted to `makeTradeService(deps)` + `trade-service.prod`
- [x] `Catalog` read port + pg adapter + fake usage
- [x] `trade-service` orchestration unit test (now reachable through the seam)

**Slice 2 — `pull` + `token-service` (done):**
- [x] `ChildStore` port (`spendOne`/`incrementColumn`/`clampedGrant`/`readColumn`)
      + pg adapter + in-memory fake + shared contract suite
- [x] `RewardGranter` port promoted to `features/rewards/reward-granter.ts` (shared
      by trade + pull); full `RewardStore` deferred to the rewards slice
- [x] `pull-service` → `makePullService(4 ports)` + `pull-service.prod`;
      `token-service` → `makeTokenService(ChildStore)` + `token-service.prod`
- [x] `server-only` dropped from both services (sunk to the pg adapters);
      `requireParent()` lifted to the action layer (added to `sacrificeAction`,
      already present on the grant path)
- [x] `pull-service` (10) + `token-service` (5) orchestration unit tests — the
      deep code, unit-tested for the first time
- [x] Retired `pull.model.test.ts` — its CAS/grant mirror is now the `ChildStore`
      fake, proven against Postgres by the contract suite

**Contract suites vs the real pg adapters (done):**
- [x] `tests-pg/` runs the SAME contracts against `*.pg.ts` over a local Postgres
      fronted by a Neon HTTP proxy (keeps `db.batch` intact) — `docker-compose.yml`
      + `pnpm pg:up` / `test:pg` / `pg:down`, separate `vitest.pg.config.ts` so
      `pnpm test` needs no DB
- [x] 14 concrete conformance cases pass against Postgres, including `swapCards`'
      guarded `db.batch`; exhaustive property fuzzing stays on the fake
      (`{ properties: false }` on the pg run) to avoid hammering the DB

**Slice 3–4 — `quiz` + `rewards` (done):**
- [x] `RewardStore` (`claimReward` single-grant / `listPending` / `markShown`) and
      `QuizStore` (`completionsFor` / `recentCompletions` / `recordCompletion`) ports
      + pg adapters + fakes + shared contract suites (fake **and** pg)
- [x] `CollectionStore.ownedCardIds` added (rewards needs it); `Catalog.listThemes`
      added (pending-reward view)
- [x] `rewards/service` → `makeRewardService(collections + RewardStore + catalog)`
      (satisfies `RewardGranter`); `quiz-service` → `makeQuizService(QuizStore +
      ChildStore)`, absorbing `quiz/activity.ts` (deleted; types moved to `quiz/types`)
- [x] `server-only` dropped from both; pull/trade prod now inject `rewardService`
      instead of the bare `grantCompletionRewards`
- [x] Orchestration unit tests — reward cascade + dedup, quiz cap RMW / lucky-ticket
      grant (the non-atomic day-bucket logic every bug lived in), now unit-tested
- [x] pg contract run covers all four stores (Collection/Child/Reward/Quiz)

All five mutating services (`pull`, `trade`, `token`, `quiz`, `rewards`) are behind
ports. Remaining direct-`db` readers (`binder/service`, `admin/service`,
`profiles/service`, `pool/*`) are read paths outside the original seam scope.

**Remaining:**
- [ ] Behaviour-change follow-ups (below)

### Second follow-up — `sacrifice` of an exact-cost holding throws (found 2026-07-19)

`sacrifice` removes `SACRIFICE_COST` (3) copies guarded `count >= 3`. A child holding
*exactly* 3 passes the guard, so the decrement targets `count = 0`, which violates
`CHECK(count >= 1)` and throws (the row should be deleted, not zeroed) — instead of a
clean sacrifice-your-last-set. Pre-existing; preserved faithfully by `removeCard`
(both adapters throw the CHECK). Natural to fix alongside the `swapCards` follow-up
once the collection writes own their "delete row at 0" semantics. **Status: open.**

## 2 · Collapse the signed-token cluster — **Strong**

**Files.** `lib/webcrypto.ts`, `lib/signed-token.ts`, `pull/offer.ts`,
`quiz/quiz-offer.ts`, `admin/gate-token.ts`, `admin/gate.ts`.

**Problem.** One "signed HMAC token" concept spread across six files with two live
duplications: `gate-token` re-implements `signed-token`'s exact format; `gate.ts`
hand-rolls `equalBytes`+`sha256`, duplicating `webcrypto.timingSafeEqual`. Three
copies of constant-time compare.

**Solution.** `gate-token` becomes `signToken({exp})` over `signed-token`; `gate.ts`
imports `timingSafeEqual`. `offer`/`quiz-offer` keep only their typed payload guard.
All crypto lands in `webcrypto` + `signed-token`.

**Wins.** One home for constant-time compare · delete two silent duplications ·
security logic auditable in one module.

## 3 · One action wrapper, not five — **Worth exploring**

**Files.** `profiles/actions.ts`, `pull/actions.ts`, `trade/actions.ts`,
`quiz/actions.ts`, `rewards/actions.ts`.

**Problem.** The action shape (auth → validate → service → `revalidatePath`) is
re-invented in five forms that disagree on failure — throw vs redirect vs soft
`{ok:false}` vs silent. `sacrificeAction` doesn't even use the helper in its own file.

**Solution.** One shared `withActor({ guard, paths }, run)` module; features supply
only what differs.

**Wins.** Leverage: one interface, N call sites · one failure mode, not four ·
revalidation policy stops drifting.

## 4 · Make the auth decision visible — **Worth exploring**

**Files.** `auth/config.ts`, `auth/policy.ts`, `auth/guard.ts`,
`profiles/active-profile.ts`, `middleware.ts`.

**Problem.** The real gate is the `signIn` callback that denies non-parents a
session; everything else is redundant re-checking of the same allowlist in 3 layers.
Four idioms fetch the active child (throw / redirect / soft / silent).

**Solution.** One access module names the decision once and separates "is parent"
(auth) from "which child is selected" (UX convenience the code admits is not a
security boundary).

**Wins.** Auth rule visible in one interface · four active-child idioms → one ·
auth check no longer fused with UX state.

## 5 · Reverse the shallow extractions — **Worth exploring**

**Files.** `lib/brand.ts` (dead), `db/child-reads.ts`, `pull/ticket-display.ts`,
`binder/rarity-filter.ts`, `binder/rarity-slot.ts`.

**Problem.** The spree over-extracted. `brand.ts` is fully dead;
`ticket-display.specialTicketTotal` and `rarity-filter.totalOwned` are dead exports;
`child-reads`, `shouldShowAskParent`, `raritySlotClass` are 1-line hypothetical seams
(≤2 callers) whose doc-comment out-masses their body.

**Solution.** Delete the dead code. Inline the hypothetical seams back to their
callers (or fold `child-reads` into the Store from #1). Keep only genuinely deep
helpers — `rng`, `storage`, `collection-writes`, `logic`.

**Wins.** Fewer files per concept · delete 1 dead module + 2 dead exports · deletion
test as the extraction rule.
