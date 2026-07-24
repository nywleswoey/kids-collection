# Increment 19 — Unify Special Tickets → Easter Egg Ticket: Verification Questions

**Intent**: Collapse all special tickets into a single "easter egg" ticket.

Please answer each question by filling in the letter after the `[Answer]:` tag. If none fit, choose the last option (Other) and describe your preference. Let me know when you're done.

---

## Context (what exists today)

There are currently **6 separate special-ticket balances** a child can hold, each redeemed on the pull screen for a guaranteed **pick-1-of-5** — the difference is only *which cards* the 5 choices are drawn from:

- ✨ **Epic ticket** — 5 choices from epic + legendary
- 🍀 **Lucky ticket** — 5 choices from common + rare
- 🎯 **Rarity-pick ticket** (×4: common / rare / epic / legendary) — 5 choices all of one exact rarity

Separately, there is a **~1% random "easter egg"** that can fire during a normal pull and shows an epic+ pick-1-of-5 — this is a random event, **not** a grantable/spendable ticket.

---

## Question 1 — What does ONE easter egg ticket give when redeemed?
This is the main decision. All 6 tickets today give a guaranteed **pick-1-of-5**; they only differ by which rarities the 5 candidates come from. The unified ticket needs one behavior.

A) Pick-1-of-5 from **epic + legendary** only (the current ✨ "premium" behavior — best matches the "easter egg = something special" feel)

B) Pick-1-of-5 from **any rarity** (5 random cards drawn across all tiers, mixed)

C) Pick-1-of-5 where each of the 5 candidates is drawn by the **normal rarity odds** (mostly common, rare legendary) — i.e. a normal-odds pool but you still get to pick

D) Pick-1-of-5 from **common + rare** only (the current 🍀 behavior)

X) Other (please describe after [Answer]: tag below)

[Answer]: random hit rate of 1 of the current easter egg behaviours

## Question 2 — What happens to tickets children ALREADY hold?
Existing children may have counts spread across the 6 old columns. When we migrate to the single balance:

A) **Sum them 1:1** — add up all 6 old balances into the new easter-egg balance (nobody loses any tickets)

B) **Reset to 0** — everyone starts fresh with 0 easter egg tickets

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — The ~1% random easter-egg trigger during pulls
This is the random event (not a ticket) that occasionally fires on a normal pull.

A) **Leave it unchanged** — out of scope; it stays as-is (epic+ pick-1-of-5)

B) **Match the new ticket** — make the random trigger use whatever tier you chose in Q1, for consistency

C) **Remove it** — drop the random trigger entirely; easter eggs only come from tickets now

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Name & icon for the unified ticket
Shown on the child landing, profile rows, admin grant, and pull screen.

A) Name **"Easter Egg ticket"**, icon 🥚

B) Name **"Easter Egg ticket"**, keep the ✨ sparkle icon

C) Name **"Easter Egg ticket"**, icon 🍳 / other egg emoji

X) Other (please describe the exact name + emoji after [Answer]: tag below)

[Answer]: A

## Question 5 — Admin grant control (Manage Profiles)
Today the admin sees 6 steppers per child (✨ 🍀 and 🎯 ×4). After unification:

A) **One stepper** for the easter egg ticket, with the same controls as tokens (+1 / +5 / type-in Grant / −1)

B) **One stepper**, simple (+1 / −1 only)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 6 — Sacrifice reward (Inc16 feature)
Today, sacrificing 3 duplicate copies of a card grants a **rarity-pick ticket matching that card's rarity**. With a single unified ticket there's no rarity dimension anymore.

A) Sacrificing **3 duplicates → 1 easter egg ticket** (same threshold, rarity no longer matters)

B) Keep the sacrifice feature but change the threshold (describe)

C) Remove the sacrifice-for-ticket feature entirely

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 7 — Rollout
This change requires a database migration and redeploy to production.

A) **Build, migrate, and deploy to prod** when done (the usual flow for these increments)

B) **Build only** — stop before applying the migration / deploying; I'll deploy later

X) Other (please describe after [Answer]: tag below)

[Answer]: A
