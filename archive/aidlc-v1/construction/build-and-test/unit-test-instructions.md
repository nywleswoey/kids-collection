# Unit Test Execution

## Run
```bash
pnpm test          # vitest run
pnpm test:watch    # watch mode
```

## Coverage (property-based, fast-check)
| File | Covers |
|---|---|
| `tests/logic.pbt.test.ts` | U1 draw distribution (BR1), token non-negative/exactly-one-spend (BR5/6), duplicate count (BR8/9), progress bounds (BR11) |
| `tests/auth-policy.pbt.test.ts` | U2 allowlist normalization + membership (case/whitespace invariance) |
| `tests/pool.test.ts` | U3 seed validation, prompt style, image-gen retry + 429/Retry-After |
| `tests/pull.model.test.ts` | U4 spend model (min(N,K) succeed, never negative, out-of-tokens no-op, grant) |
| `tests/binder.test.ts` | U5 owned/locked mapping + progress + duplicates |
| `tests/card.test.ts` | U6 rarity class/label mapping |
| `tests/admin.test.ts` | U7 overview row mapping |

## Expected
- **27 tests, 7 files, 0 failures** (last run: all pass, ~1.5s)
- PBT extension (blocking) satisfied for all core logic.

## On failure
1. Read vitest output (failing property + shrunk counterexample).
2. Fix logic; rerun until green.
