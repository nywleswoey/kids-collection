# Increment 6 — Missing-Card Names & Easter-Egg Pick: Build & Test Instructions

**Scope**: Server pull-flow change (Security) + UI (picker/roulette/fireworks) + locked-card names. New property tests for the pure/security cores.

## Build
```bash
pnpm install     # zero new dependencies
pnpm typecheck
pnpm build
```
Expected: typecheck clean; build compiles; no package.json / lockfile changes.

## Automated tests
```bash
pnpm test        # vitest run
```
Expected: **52/52 pass** — includes `easter-egg.pbt` (roll boundary; choices are epic+, ≤n, distinct) and `offer.pbt` (round-trip; forged/expired/wrong-secret/malformed → null). Existing pull/economy tests unchanged.

## Security verification (extension)
- `AUTH_SECRET` absent from `.next/static` (client bundle) — confirmed by grep.
- Egg probability rolled server-side; offer HMAC-signed; claim rejects forged/expired/wrong-child/un-offered/non-epic+.
- Claim spends one token atomically (no double-spend, no free cards). No blocking findings.

## Manual QA (via `pnpm dev`) — recommend forcing the egg
The egg is ~1% — to exercise the flow, temporarily set `EGG_CHANCE = 1` in `src/features/pull/easter-egg.ts`, run, then **revert**.
1. **Egg trigger** — Discover → the 5-card epic+ picker appears; ticket count shows the refund (unchanged net).
2. **Pick + roulette** — tap a card → ~2.7s decelerating roulette lands on it → **fireworks** (not confetti) → the card reveals; it appears in the binder; net one ticket spent.
3. **Abandon** — trigger the egg, don't pick, reload → the ticket was refunded (costs nothing).
4. **Tamper** — the claim can't grant an un-offered or non-epic+ card (server-enforced).
5. **Missing names** — `/play/binder`: locked slots show the card name under ❔ (art hidden).
6. **Reduced motion** — roulette skips to the result; fireworks disabled.

## Verification results (this run)
- typecheck clean ✅ · `pnpm test` 52/52 ✅ · `pnpm build` ✅ · zero new deps ✅ · AUTH_SECRET not in client bundle ✅

## Acceptance criteria — status
1. Locked slots show names — ✅
2. ~1% egg → 5 epic+ picker → roulette → fireworks → reveal; costs one token — ✅ (visual-verify with forced chance)
3. Egg can't be forced from client; claim rejects forged/expired/un-offered; no double-spend — ✅ (tests + code)
4. Non-egg discovers unchanged; reduced-motion skips roulette + fireworks — ✅
5. typecheck/build/tests green, zero new deps, no testid regressions — ✅
