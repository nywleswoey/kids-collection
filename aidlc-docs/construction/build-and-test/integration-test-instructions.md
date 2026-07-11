# Integration Test Instructions

Cross-unit flows against a real (or Neon-branch) database. Currently **manual/verification-based**; automate with Playwright later if desired.

## Setup
```bash
vercel env pull .env.local
pnpm db:migrate
pnpm seed --publish          # populate the pool (idempotent; rerun for 429 gaps)
pnpm dev                     # http://localhost:3000
```

## Scenarios

### S1 — Auth gate (U2)
- Visit `/play` unauthenticated → redirected to `/signin`.
- Sign in with a **non-allowlisted** Google account → denied (no profiles/admin).
- Sign in with an allowlisted `PARENT_EMAILS` account → profile picker.

### S2 — Profile → pull → collection (U2→U4→U5)
- Create a child (starts with 3 tokens); select profile.
- Pull 3 times → cards revealed; balance → 0; 4th pull shows "ask your parent".
- Open binder → pulled cards owned, correct theme + progress; duplicates show `xN`.

### S3 — No double-spend (U4) `[SEC]`
- With 1 token, rapidly double-tap Pull → exactly one card, balance 0 (never negative).

### S4 — Reward loop (U7→U4)
- As parent, `/admin` → grant +5 to the child → child balance updates → can pull again.

### S5 — Oversight (U7) `[SEC]`
- `/admin` shows each child's balance + progress; open a child's read-only binder.
- A child-scoped session cannot reach `/admin/*` (redirect).

### S6 — Seed safety (U3) `[SEC]`
- `pnpm seed --review` writes images to `seed/review/`; only reviewed cards published.

## Expected
All scenarios pass; no cross-child data leakage; balances consistent.
