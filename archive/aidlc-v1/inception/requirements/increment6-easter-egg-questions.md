# Increment 6 — Missing-Card Names & Easter-Egg Pick: Clarification Questions

**Type**: Enhancement (brownfield) — presentational + a server-side pull-flow change (Security-relevant).
**Intent (your request)**: (1) show the card name on missing/locked cards; (2) a very-very-rare easter egg on discover that lets the kid pick 1 of 5 epic+ cards, celebrated with fireworks (not confetti).

Answer each after its `[Answer]:` tag. Recommended default listed first.

---

## Q1 — Easter-egg odds
"Very very small" chance per discover. How rare?

A) **~0.5%** (about 1 in 200 discovers)

B) ~1% (1 in 100)

C) ~0.2% (1 in 500) — rarer

D) Other (describe after [Answer]:)

[Answer]: B

---

## Q2 — The 5 offered cards: rarity mix
The 5 choices are all epic+. Pick the pool they're drawn from:

A) **Mixed epic + legendary** (whatever the pool has; each of the 5 is randomly epic or legendary)

B) All **legendary** only (jackpot)

C) Exactly some split (e.g. 3 epic + 2 legendary)

D) Other (describe after [Answer]:)

[Answer]: A

---

## Q3 — Duplicates in the 5 choices
Should the 5 offered cards avoid ones the kid already owns?

A) **Prefer unowned** epic+ cards; fall back to any epic+ if not enough unowned

B) Any epic+ (owned or not) — duplicates are fine (they stack)

C) Other (describe after [Answer]:)

[Answer]: B

---

## Q4 — If the kid doesn't pick (closes tab mid-offer)
The token is already spent when the egg triggers. If they never pick…

A) **Token stays spent, no card** — the offer is a signed, short-lived choice; if abandoned, it's lost (rare event, keeps it simple/tamper-proof)

B) Auto-grant a random one of the 5 if abandoned (needs the offer persisted server-side)

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q5 — Missing-card name: spoiler check
Locked slots will show the card **name** (not the art). Confirm scope:

A) **Show the name only** (art still hidden as ❔/silhouette until collected)

B) Show name + rarity badge too

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q6 — Fireworks celebration
"Fireworks, not confetti." Where/how big?

A) **Full-screen fireworks burst** during the easter-egg moment (the pick screen), reduced-motion aware

B) Fireworks only after the pick is confirmed (on the chosen card)

C) Both — a burst on trigger and again on confirm

D) Other (describe after [Answer]:)

[Answer]: A

---

## Q7 — Scope confirmation
This spans a **server-side pull-flow change** (rare egg trigger + a signed offer + a claim action, no schema change), plus UI (5-card picker, fireworks) and the locked-slot name. Existing pull/economy otherwise unchanged (still costs 1 token, no double-spend). Agree?

A) Yes, proceed with both features together

B) Split — do a subset first (tell me which)

C) Other (describe after [Answer]:)

[Answer]: A
