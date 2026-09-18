# INCREMENT 13 — Build & Test Instructions

LIGHT increment. No migration, no seed. No env changes.

## Build
```bash
pnpm install      # no new deps expected
pnpm typecheck    # tsc --noEmit → clean
pnpm build        # Next.js production build → success
```

## Test
```bash
pnpm test         # vitest run → 85 passing
```
Run 2–3× to confirm PBT stability (rarity-filter, math-gen, sacrifice-hint).

New/updated tests:
- `tests/rarity-filter.pbt.test.ts` — owned counts sum to owned total; filter keeps rarity subset incl. locked.
- `tests/sacrifice-hint.test.ts` — per-child key; set→get; SSR (no window) + private-mode throw safety.
- `tests/quiz-bank.test.ts` — every grammar item has a non-empty explanation.
- `tests/quiz-math-gen.pbt.test.ts` — explanation contains the answer, no leftover "?".

## Manual QA (recommended before prod)
1. **FR1/2 Galaxy** (`/play/binder`): rarity chip row shows owned counts; tap a rarity → view filters to that rarity (owned + locked). Switch category tab → rarity counts recompute. "All rarities" clears.
2. **FR3 Tickets**: `/play/home` shows 🎟️/✨/🍀 counts. `/admin/profiles` (behind passcode) each row shows the three counts.
3. **FR4 First duplicate**: fresh browser/profile, pull until a duplicate → modal appears once. Dismiss, pull another duplicate → no modal. "Show me!" opens the card in the galaxy.
4. **FR5 Special pick**: grant an epic/lucky ticket, use it → pick 1 of 5 → reveals immediately (no spin) with fireworks.
5. **FR6 Quiz**: `/play/learn/<topic>` → answer a question wrong → ❌ + correct answer + 💡 why + Next; answer right → ✅. Reward still only on all-correct.

## Security / NFR notes
- FR6 sends quiz answer keys to the client for feedback (documented tradeoff). Award re-scored server-side against the signed offer — reward integrity preserved.
- No secret in client bundle (verified: AUTH_SECRET / ADMIN_PASSCODE absent from `.next/static`).
- localStorage access is SSR- and private-mode-safe.

## Deploy
- Push `main` → Vercel production. **No `db:migrate`, no `seed` required.**
