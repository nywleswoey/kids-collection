# Increment 6 — Missing-Card Names & Easter-Egg Pick: Requirements

**Status**: Ready for approval
**Type**: Brownfield — presentational + a server-side pull-flow change. Security-relevant. No schema change.
**Depth**: Standard (Comprehensive on the easter-egg economy/security)
**Source**: User request + answers in `increment6-easter-egg-questions.md`.

## Intent
Show kids the names of cards they haven't collected yet, and add a very rare "jackpot" moment on discover where they pick 1 of 5 epic+ cards, celebrated with fireworks.

## Decisions (from answers)
| # | Topic | Decision |
|---|---|---|
| 1 | Egg odds | **~1%** per discover (1 in 100), server-side |
| 2 | 5-card rarity | **Mixed epic + legendary** (each drawn from the epic+ pool) |
| 3 | Dedup | **Any epic+** — duplicates allowed (they stack) |
| 4 | Unclaimed offer | **Token stays spent, no card** — offer is signed + short-lived |
| 5 | Locked-slot spoiler | **Name only** (art stays hidden until collected) |
| 6 | Fireworks | **Full-screen burst on the pick screen**, reduced-motion aware |
| 7 | Scope | Both features together |

## Functional Requirements

### FR1 — Show name on missing (locked) cards
- Locked binder slots show the card **name** under the ❔ silhouette. Art stays hidden until collected. No rarity badge (Q5). Applies to kid binder (and admin preview already shows names).

### FR2 — Rare easter egg: pick 1 of 5 epic+
- **Server-side trigger** (in `pull-service`): on each discover, after the atomic token spend, roll **~1%** (server RNG, not client). Only triggers if the pool has ≥1 epic+ card.
- **On trigger** (no immediate collection write):
  - Select **5 epic+ candidates** at random from the epic/legendary pool (mixed; duplicates across the 5 avoided for a nicer pick, but owned cards allowed). If fewer than 5 distinct epic+ exist, offer as many as available.
  - **Refund** the token just spent, and return a **signed offer** — HMAC (AUTH_SECRET) over `{ childId, cardIds[], exp }` — plus the 5 candidate cards and the (refunded) balance. Token is **not** net-consumed until the pick.
- **Claim** (`claimEasterEgg(offer, chosenCardId)` server action):
  - Verify the offer signature + not expired + `childId` == active child; verify `chosenCardId` ∈ the offered ids (server-enforced — can't pick an un-offered card).
  - **Atomically spend 1 token** (the cost of this discover; no-double-spend, out-of-tokens safe) and upsert the chosen card's collection count. Return the normal `PullResult` (card + isDuplicate + newBalance).
- **Net economy**: exactly **1 token per claimed egg card** — identical to a normal discover. No free cards, no double-spend.
- **Client**: `PullButton` detects the `easterEgg` outcome → shows the 5-card picker + full-screen **fireworks**; picking calls `claimEasterEgg`; on success shows the chosen card (reveal). If abandoned, the token was refunded at trigger and re-spent only on claim, so an unclaimed egg costs nothing beyond the original discover attempt (kid can just discover again). *(Chosen over "token lost" — cleaner and still tamper-proof.)*

### FR3 — Fireworks celebration
- New `Fireworks` effect (distinct from confetti): full-screen bursts on the easter-egg pick screen. Transform/opacity only; disabled under `prefers-reduced-motion`.

## Non-Functional Requirements

### NFR1 — Security (extension: enforced)
- Egg probability rolled **server-side**; the client cannot force it.
- The offer is **HMAC-signed** (AUTH_SECRET); claim rejects forged/expired offers, wrong child, or an un-offered card.
- Claim performs an **atomic token spend** (reuse the existing compare-and-swap), so each granted epic+ card costs exactly one token — no free grants, no double-spend. Short offer expiry (≈120s) bounds any replay to "one epic+ per token" during that window (documented, low-stakes).
- No secrets to the client or logs.

### NFR2 — No regression / economy integrity
- Non-egg discovers are byte-for-byte unchanged. Token economy invariant preserved: 1 token → 1 card. Existing `data-testid` preserved; existing pull/binder tests stay green.

### NFR3 — Accessibility / performance
- Fireworks + picker honor reduced-motion (fireworks off; picker still usable). Rarity still shown by label where present. Zero new runtime dependencies.

## Out of Scope
- Schema/DB changes; changing normal drop weights; new rarities; making the egg configurable in admin.
- Locked-slot art reveal or rarity badge (name only).

## Extension Compliance (enabled: Security, Resiliency, Property-Based Testing)
- **Security — APPLICABLE & enforced**: server-side RNG, HMAC-signed offer, atomic spend on claim, chosen-card ∈ offer, no double-spend, no secrets leaked. Verified before completion.
- **Resiliency**: reuse the atomic spend + best-effort refund; claim fails safe (invalid/expired offer → no grant); abandoned offer costs nothing.
- **Property-Based Testing**: pure cores — `pickEasterEggChoices(pool, n)` (all returned are epic+, ≤ n, distinct) and offer `sign/verify` (forged/expired/wrong-child/un-offered rejected) get fast-check tests. Existing 45 stay green.

## Acceptance Criteria
1. Locked binder slots show the card name (art hidden).
2. ~1% of discovers trigger the egg: a 5-card epic+ picker with fireworks; picking grants that card and costs exactly one token overall.
3. The egg cannot be forced from the client; claim rejects forged/expired/un-offered picks; no double-spend.
4. Non-egg discovers unchanged; reduced-motion disables fireworks.
5. `pnpm typecheck` clean, `pnpm build` succeeds, tests green (≥45 + new PBT), zero new deps, no `data-testid` regressions.
