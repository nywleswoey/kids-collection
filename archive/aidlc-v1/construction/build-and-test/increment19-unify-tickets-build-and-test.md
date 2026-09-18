# Increment 19 — Build & Test: Unify Special Tickets → Easter Egg Ticket

Single-increment brownfield refactor (LIGHT-MEDIUM). No new deps.

## Build
```bash
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run (in-memory suite)
pnpm build       # next build (runs ESLint in-pipeline)
```
- **typecheck**: clean ✅
- **test**: 174/174 passed ✅ (37 files)
- **build**: success ✅ — all routes compiled; no `authSecret`/`AUTH_SECRET` in `.next/static` (NFR2).
- Note: standalone `next lint` OOM'd in this environment; lint runs inside `next build`, which passed.

## Unit / property tests (key coverage)
- `rollWeightedRarity` — weight-band mapping + empirical distribution ≈ RARITY_WEIGHTS (NFR3).
- `pickRarityChoices` — candidates always match the rolled rarity, ≤ 5.
- `pull-service` — `pullEasterEgg` rolls + offers without spending; `claimEasterEgg` spends `easterEggTickets` (single-use); `sacrifice` grants one ticket.
- `token-service` — `grantEasterEgg`/`getEasterEggBalance`.
- `quiz-service` — pass grants `easterEggTickets`; daily cap 3 preserved.
- Store contract (fake + pg) — new `pullTokens | easterEggTickets` column set.

## Integration / migration (applied to Neon)
```bash
# DATABASE_URL sourced from .env.local
pnpm db:migrate     # applies 0005_unify_easter_egg_tickets
```
- **Applied successfully** to Neon prod DB (2026-07-25).
- Pre-check (read-only): 3 children, Σ of the 6 old ticket columns = **0** → zero-risk backfill.
- Post-verify: `children` columns now `id, name, avatar, pull_tokens, easter_egg_tickets`; the 6 old columns dropped; `Σ easter_egg_tickets = 0` (sum invariant holds); checks `pull_tokens_non_negative`, `easter_egg_tickets_non_negative` present.
- `pnpm db:generate` → "No schema changes" (live schema ↔ drizzle snapshot consistent).

## Manual/browser verification (deferred)
- Redeem flow (Open Easter Egg → tier reveal → pick-1-of-5 → claim), admin 🥚 grant, sacrifice→🥚, quiz→🥚 pill: best verified post-deploy in-app (interactive Google auth), consistent with prior increments.

## Overall
- Build ✅ · Tests 174/174 ✅ · Migration applied + verified ✅
- **Ready for Operations (prod deploy)**: Yes.
