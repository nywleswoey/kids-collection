# U4 Pull & Rewards — NFR Requirements

Core gameplay. Correctness under concurrency (Security) + PBT are the dominant NFRs. No new infra; no open questions.

## Security / Correctness `[blocking]`
- **U4-SEC-1** No double-spend: token decrement via single conditional UPDATE (`WHERE pull_tokens >= 1`); a token can't be spent twice or below zero, even on rapid taps.
- **U4-SEC-2** Pull operates only on the **active child** from the server cookie (U2); no client-supplied childId is trusted for who-pulls.
- **U4-SEC-3** Token grants are **parent-only** (`requireParent`); children cannot self-grant.
- **U4-SEC-4** Pull/grant amounts validated server-side (positive integers; balance clamped ≥ 0).

## Reliability
- **U4-REL-1** If collection write fails after token spend, attempt refund; log any refund failure (no silent token loss beyond rare edge).
- **U4-REL-2** Out-of-tokens path never partially mutates (no draw, no spend).

## Performance
- **U4-PERF-1** A pull = 1 pool read + 1 conditional UPDATE + 1 upsert (3 cheap queries). Feels instant at family scale. Pool read may be cached per request.

## Testability `[PBT blocking]`
- **U4-TEST-1** Pure draw/spend/grant already property-tested (U1).
- **U4-TEST-2** Integration tests (Build & Test): concurrent pulls never overspend; out-of-tokens no-op; duplicate increments count; grant adds exactly N and never negative.

## Usability / Accessibility
- **U4-UX-1** Pull button large + central; one tap; clear disabled/out-of-tokens state.
- **U4-UX-2** Duplicate clearly indicated; balance always visible (F2). Reveal animation honors reduced-motion (U6).
