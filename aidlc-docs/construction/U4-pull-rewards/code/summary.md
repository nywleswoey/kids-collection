# U4 Pull & Rewards — Code Summary

## Files created
### Services
- `src/features/pull/pull-service.ts` — `pull(childId)`: atomic CAS spend (`WHERE pull_tokens >= 1`), `drawCard`, `ON CONFLICT` count+1, best-effort refund. Returns `PullOutcome`.
- `src/features/pull/token-service.ts` — `getBalance`, `grant` (parent-only, `GREATEST(0, …)`).
- `src/features/pull/actions.ts` — `pullAction` (active child), `grantTokensAction` (requireParent).

### UI
- `app/play/pull/page.tsx` — PullScreen (balance + button)
- `src/features/pull/PullButton.tsx` — client pull, out-of-tokens state, shows result
- `src/features/pull/PullResultView.tsx` — minimal card + duplicate badge (**placeholder; U6 replaces with effects**)
- `app/play/home/page.tsx` — wired "Pull a card" + "My binder" links

### Tests
- `tests/pull.model.test.ts` — property tests of the spend model (min(N,K) succeed, never negative, out-of-tokens no-op, grant non-negative). Real DB concurrency test → Build & Test.

## Story closure
- **C1** pull ✅ · **C3** out-of-tokens ✅ · **C4** duplicates ✅ · **F1** grant ✅ · **F2** balance ✅
- **C2** reveal animation → deferred to U6 (PullResultView is a placeholder).

## Notes
- No double-spend: single conditional UPDATE is the arbiter.
- `/play/binder` link is live but the binder page arrives in U5.
