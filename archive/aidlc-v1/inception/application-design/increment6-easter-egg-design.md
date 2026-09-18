# Increment 6 — Missing-Card Names & Easter-Egg Pick: Application Design

**Status**: Ready for approval
**Depth**: Standard (Comprehensive on easter-egg security/economy) · **Cadence**: LIGHT
**Principle**: Pure cores for the egg logic + offer signing (testable); server-side trigger + HMAC-signed offer + atomic claim spend (no double-spend, no forcing); reuse `RevealCard`/`Card`; no schema change; all motion reduced-motion-aware.

## New / changed module layout
```
src/features/pull/
  easter-egg.ts        # PURE: EGG_CHANCE, rollEasterEgg(rng), pickEasterEggChoices(pool,n,rng) — PBT
  offer.ts             # PURE/isomorphic: makeOffer/verifyOffer (HMAC over {childId,cardIds,exp}) — PBT
  pull-service.ts      # + egg roll after spend (refund + signed offer); + claimEasterEgg()
  actions.ts           # + claimEasterEggAction(offer, chosenCardId)
  PullButton.tsx       # detect easterEgg outcome → render EasterEggPicker
  EasterEggPicker.tsx  # NEW "use client": 5-card choices → claim → roulette → fireworks → reveal
src/features/anim/
  Fireworks.tsx        # NEW "use client": full-screen bursts (distinct from confetti), reduced-motion off
  anim.css             # + roulette highlight + fireworks keyframes
src/features/binder/
  CardSlot.tsx         # locked slot shows the card NAME under the silhouette (FR1)
src/lib/types.ts       # PullResult unchanged; PullOutcome (in pull-service) gains an easterEgg branch
```

## FR1 — Missing-card name
- `CardSlot` locked branch: keep ❔ silhouette, add `entry.card.name` beneath (small, muted). Art still hidden. No rarity badge (Q5). `data-testid` unchanged.

## Easter-egg pure cores (Security/PBT)
- **easter-egg.ts**:
  - `EGG_CHANCE = 0.01`.
  - `rollEasterEgg(rng = Math.random): boolean` → `rng() < EGG_CHANCE`.
  - `pickEasterEggChoices(pool, n = 5, rng = Math.random): Card[]` → filter epic|legendary, shuffle (Fisher–Yates with rng), take up to `n` **distinct**. **Property**: every result is epic+, length ≤ min(n, epic+ count), no dup ids.
- **offer.ts** (Web Crypto, like `gate-token`): `makeOffer({childId, cardIds, exp}, secret)` → `base64url(json).hmac`; `verifyOffer(token, secret, now)` → payload if signature valid AND `exp > now`, else `null`. No secret stored in the token. **Property**: forged/expired/tampered offers verify null; a fresh offer round-trips.

## FR2 — Server pull flow (`pull-service.ts`)
- `PullOutcome` gains: `{ outOfTokens: false; easterEgg: true; choices: Card[]; offer: string; newBalance: number }`; the normal branch stays as-is.
- `pull(childId)`:
  1. Atomic compare-and-swap spend (unchanged). Out-of-tokens → return.
  2. Load pool. **Roll egg** (`rollEasterEgg`). If egg **and** pool has ≥1 epic+:
     - **Refund** the token (reuse the existing refund update).
     - `choices = pickEasterEggChoices(pool, 5)`; `offer = makeOffer({ childId, cardIds: choices.map(c=>c.id), exp: now + 120_000 }, AUTH_SECRET)`.
     - Return `{ easterEgg:true, choices, offer, newBalance: balance + 1 }`.
  3. Else: normal draw + upsert (unchanged path).
- `claimEasterEgg(childId, offer, chosenCardId)`:
  - `verifyOffer` → payload or throw; assert `payload.childId === childId` and `chosenCardId ∈ payload.cardIds`.
  - Load the chosen card (`getCard`); assert it's epic+ (defense in depth).
  - **Atomic spend 1 token** (the cost; out-of-tokens safe, no double-spend) → upsert count → return `PullResult`.
- **Net economy**: 1 token per claimed egg card; abandoned egg = token was refunded, so it costs nothing.

## FR2 client + FR3 roulette + FR4 fireworks
- **actions.ts**: `claimEasterEggAction(offer, chosenCardId)` → `getActiveChild` → `claimEasterEgg` → `revalidatePath('/play/*')` → `PullOutcome`-like result.
- **EasterEggPicker.tsx** (`"use client"`): props `{ choices, offer, onDone(result) }`.
  1. Render the 5 candidate cards as buttons + a "✨ Jackpot! Pick one ✨" header.
  2. On select → call `claimEasterEggAction(offer, chosenId)` (server decides/records; the pick is the winner).
  3. **Roulette (FR3)**: highlight cycles through the 5 with a **decelerating** interval for ~2.5–3s, ending on the chosen index (setTimeout chain; `shouldAnimate()` false → skip straight to reveal).
  4. On land → **Fireworks (FR4)** + reveal the chosen card (`RevealCard`/`Card`), then `onDone`.
- **Fireworks.tsx** (`"use client"`): full-screen burst layer, `fire` counter prop, capped particles, transform/opacity keyframes in `anim.css`; renders nothing under reduced-motion.
- **PullButton.tsx**: if `outcome.easterEgg` → render `<EasterEggPicker choices offer onDone={...}/>` (updates balance from the claim result) instead of the normal `RevealCard`. Non-egg path unchanged.

## Frozen / untouched
Normal discover path (byte-for-byte), drop weights, token-economy invariant (1 token → 1 card), schema, auth/passcode, all existing `data-testid`, Increment 1–5 behavior.

## Extension compliance
- **Security (enforced)** — egg RNG server-side; offer HMAC-signed (AUTH_SECRET), verified for signature+expiry+child; `chosenCardId` must be in the offer AND epic+; claim spends atomically (no double-spend / no free cards); ~120s expiry bounds replay to "one epic+ per token"; no secrets to client/logs.
- **Resiliency** — reuse atomic spend + best-effort refund; claim fails safe on invalid/expired offer; abandoned egg costs nothing.
- **Property-Based Testing** — `pickEasterEggChoices` (epic+, ≤n, distinct) and `offer` sign/verify (forgery/expiry/wrong-child/un-offered) get fast-check tests; `rollEasterEgg` boundary. Existing 45 stay green.

## Design decisions / trade-offs
- **Refund-at-trigger, spend-at-claim** — makes the egg tamper-proof (each granted epic+ costs a token via the atomic claim) while keeping an abandoned egg free; avoids any schema/persistence.
- **Server owns the winner** — the kid's pick IS the outcome; the roulette is pure suspense theatre client-side, so no extra server round-trips or trust in client timing.
- **Reuse `gate-token` HMAC approach** in `offer.ts` — proven isomorphic signer, no new deps.
- **`pickEasterEggChoices` / `rollEasterEgg` pure** — odds and selection are unit/property tested and can't be skewed by the client.
