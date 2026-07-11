# Increment 6 — Missing-Card Names & Easter-Egg Pick: Code Summary

**Status**: Implemented; typecheck/tests/build green.
**Plan**: `increment6-easter-egg-code-generation-plan.md` (all 10 steps done).

## Files added (5)
- `src/features/pull/easter-egg.ts` — PURE: `EGG_CHANCE=0.01`, `rollEasterEgg`, `pickEasterEggChoices` (epic+, distinct, ≤n).
- `src/features/pull/offer.ts` — PURE/isomorphic HMAC (Web Crypto): `makeOffer`/`verifyOffer` over `{childId,cardIds,exp}`; constant-time compare; no secret in token.
- `src/features/pull/EasterEggPicker.tsx` — `"use client"`: 5-card pick → `claimEasterEggAction` → decelerating roulette (~2.7s) landing on the pick → Fireworks + static `Card` reveal (no confetti). Reduced-motion skips straight to reveal.
- `src/features/anim/Fireworks.tsx` — `"use client"`: full-screen radial spark bursts; `fire` counter; reduced-motion → nothing.
- Tests: `tests/easter-egg.pbt.test.ts`, `tests/offer.pbt.test.ts`.

## Files changed (5)
- `src/features/pull/pull-service.ts` — `PullOutcome` gains `EasterEggOutcome`; `pull()` rolls the egg after spend → on hit refunds the token, signs a 120s offer of 5 epic+ choices, returns the egg outcome; new `claimEasterEgg()` verifies offer (sig/exp/child) + `chosen∈offer` + epic+, then atomic-spends 1 token and upserts.
- `src/features/pull/actions.ts` — `claimEasterEggAction(offer, chosenCardId)`.
- `src/features/pull/PullButton.tsx` — egg outcome → renders `EasterEggPicker`; balance reflects the refund and updates on claim; non-egg path unchanged.
- `src/features/binder/CardSlot.tsx` — locked slots show the card **name** under ❔ (FR1).
- `src/features/anim/anim.css` — fireworks burst keyframes + roulette highlight styles + reduced-motion guards.

## Behavior
- **FR1**: locked binder slots show the card name (art hidden).
- **FR2**: ~1% of discovers → server offers 5 epic+ cards; the kid picks one; claim grants it for exactly one token (refund-at-trigger, spend-at-claim). Abandoned egg costs nothing.
- **FR3**: pick → ~2.7s decelerating roulette lands on the chosen card.
- **FR4**: fireworks on landing (not confetti).

## Security (extension: enforced)
- Egg probability rolled **server-side** (`rollEasterEgg` in `pull-service`); client cannot force it.
- Offer is **HMAC-signed** with `AUTH_SECRET` — **confirmed absent from `.next/static`** (client bundle grep). Claim rejects forged/expired offers, wrong child, un-offered card, or non-epic+.
- Claim performs an **atomic compare-and-swap spend** → no double-spend, no free cards. 120s expiry bounds any replay to "one epic+ per token".
- Economy invariant preserved: 1 token → 1 card. No blocking security findings.

## Verification
- `pnpm typecheck` — clean.
- `pnpm test` — **52/52** (was 45; +2 easter-egg, +5 offer).
- `pnpm build` — compiled; **zero** dependency changes; AUTH_SECRET not in client bundle.

## Frozen / untouched
Normal discover path + drop weights, schema, auth/passcode, all existing `data-testid`, Increment 1–5 behavior.
