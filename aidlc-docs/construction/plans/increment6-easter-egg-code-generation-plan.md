# Increment 6 — Missing-Card Names & Easter-Egg Pick: Code Generation Plan

**Status**: Awaiting approval (Part 1)
**Type**: Brownfield — server pull-flow change (Security) + UI + content. Source of truth for Code Gen.
**Design**: `increment6-easter-egg-design.md`. Offer signed with existing `AUTH_SECRET`.
**Frozen**: normal discover path + drop weights, token-economy invariant (1 token → 1 card), schema, auth/passcode, all `data-testid`, Increment 1–5 behavior.

## Coverage
FR1 locked names · FR2 server egg + claim · FR3 roulette · FR4 fireworks · NFR1 security · NFR2 economy/no-regression · NFR3 a11y/zero-dep.

---

## Step 1 — Pure cores (Security, PBT)
- [ ] `src/features/pull/easter-egg.ts`: `EGG_CHANCE = 0.01`; `rollEasterEgg(rng)`; `pickEasterEggChoices(pool, n=5, rng)` → up to n distinct epic+ cards (Fisher–Yates).
- [ ] `src/features/pull/offer.ts`: `makeOffer({childId,cardIds,exp}, secret)` / `verifyOffer(token, secret, now)` — Web Crypto HMAC (same approach as `gate-token`); returns payload or null.

## Step 2 — Server pull + claim (FR2, NFR1/NFR2)
- [ ] `src/features/pull/pull-service.ts`: extend `PullOutcome` with the `easterEgg` branch; in `pull()` after spend, `rollEasterEgg` — on hit (and pool has epic+): refund token, build 5 `choices`, `makeOffer` (exp now+120s), return egg outcome; else normal path unchanged. Add `claimEasterEgg(childId, offer, chosenCardId)`: verify offer (sig/exp/child), `chosenCardId ∈ offer.cardIds`, chosen card is epic+, atomic spend 1 token, upsert, return `PullResult`.

## Step 3 — Claim action (FR2)
- [ ] `src/features/pull/actions.ts`: `claimEasterEggAction(offer, chosenCardId)` → active child → `claimEasterEgg` → `revalidatePath('/play/pull','/play/binder')` → outcome.

## Step 4 — Fireworks + animation css (FR4, FR3)
- [ ] `src/features/anim/Fireworks.tsx` (`"use client"`): full-screen burst layer, `fire` counter prop, capped particles, reduced-motion → renders nothing.
- [ ] `src/features/anim/anim.css`: add fireworks burst keyframes + roulette highlight styles; reduced-motion guard.

## Step 5 — Easter-egg picker + roulette (FR2/FR3/FR4)
- [ ] `src/features/pull/EasterEggPicker.tsx` (`"use client"`): render 5 choice cards → on select call `claimEasterEggAction`; play decelerating roulette (~2.5–3s) landing on chosen index (`shouldAnimate()` false → skip); then `Fireworks` + reveal chosen (`RevealCard`); call `onDone(result)`.

## Step 6 — Wire PullButton (FR2)
- [ ] `src/features/pull/PullButton.tsx`: if `outcome.easterEgg` → render `EasterEggPicker` (choices+offer), update balance from claim result; non-egg path unchanged. Keep `data-testid`.

## Step 7 — Locked-card name (FR1)
- [ ] `src/features/binder/CardSlot.tsx`: locked branch shows `entry.card.name` under the ❔ (art still hidden). Keep `data-testid`.

## Step 8 — Tests (PBT extension, NFR1/NFR2)
- [ ] `tests/easter-egg.pbt.test.ts`: `pickEasterEggChoices` → all epic+, ≤n, distinct; `rollEasterEgg` boundary at EGG_CHANCE.
- [ ] `tests/offer.pbt.test.ts`: fresh offer round-trips; forged/expired/tampered/wrong-secret verify null. Existing 45 stay green.

## Step 9 — Verify
- [ ] `pnpm typecheck` clean; `pnpm test` green (≥47); `pnpm build` succeeds; zero new deps; no `data-testid` regressions; secrets absent from client bundle (grep `.next/static`).
- [ ] Manual: force egg (temporarily) → picker → roulette → fireworks → reveal; locked slots show names; reduced-motion skips motion.

## Step 10 — Summary
- [ ] `aidlc-docs/construction/increment6-easter-egg/code-summary.md`.

---
**Scope**: 4 new files + tests, ~4 edits. Server-side security-sensitive (signed offer, atomic spend); zero deps.
