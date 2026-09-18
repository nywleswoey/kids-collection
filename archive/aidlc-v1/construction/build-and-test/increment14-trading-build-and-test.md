# INCREMENT 14 — Build & Test Instructions

LIGHT increment. No migration, no seed, no env changes.

## Build
```bash
pnpm install      # no new deps
pnpm typecheck    # tsc --noEmit → clean
pnpm build        # → success; /play/trade route present
```

## Test
```bash
pnpm test         # vitest run → 90 passing
```
Run 2× to confirm PBT stability (trade-logic).

New tests:
- `tests/trade-logic.pbt.test.ts` — validateTrade accept/reject matrix + property (ok iff A≠B ∧ both count≥2 ∧ same rarity ∧ distinct cards); filterTradable returns only same-rarity duplicates.

## Manual QA (recommended before prod)
Needs ≥2 profiles, and the active profile must own a duplicate.
1. `/play/home` → "🤝 Trade cards" → `/play/trade`.
2. **Step 1**: only your duplicates show (×count badge). No doubles → friendly empty state.
3. **Step 2**: pick another profile (self excluded).
4. **Step 3**: only that friend's SAME-rarity duplicates show; none → "no {rarity} doubles" empty state.
5. **Step 4 confirm**: "You give X · You get Y" → Confirm.
6. Result: both collections updated — you −1 of X (kept ≥1), +1 of Y; friend mirror. Check `/play/binder` for both.
7. **Atomicity check**: if a card stops being a double mid-flow (concurrent pull/sacrifice), confirm fails with "trade no longer valid" and NO partial swap (counts unchanged).

## Security / NFR notes
- Giver A = server-side active-profile cookie, not client input.
- Server re-validates dup-only + same-rarity + A≠B at commit; `count>=1` CHECK rolls back a non-dup decrement (whole batch atomic).
- No secret in client bundle (verified: AUTH_SECRET / ADMIN_PASSCODE / DATABASE_URL / PARENT_EMAILS absent from `.next/static`).

## Deploy
- Push `main` → Vercel production. **No `db:migrate`, no `seed`.**

## Known
- No DB-level integration test for `executeTrade` (repo has no DB test harness); pure logic path is PBT-covered, atomic path relies on the DB CHECK constraint.
