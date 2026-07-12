# INCREMENT 14 — Kid-to-Kid Trading — Clarification Questions

Feature: children trade cards with each other. Constraints given: **duplicates only** + **same rarity**.
Answer inline with `[Answer]: <letter>` (add notes freely). Recommended option marked.

**Context that shapes everything:** all child profiles live in ONE household (flat `children` table, single parent-email login, shared device). "Other kids" = sibling profiles on the same app. No cross-account / network model exists.

---

## Q1 — Trade shape: swap or gift?
- A) **Two-sided swap** — Child A gives one duplicate, Child B gives one duplicate back, both the same rarity. (Recommended — matches "trade")
- B) **One-way gift** — A gives B a duplicate, nothing back.
- C) Both modes available.

[Answer]:  A

## Q2 — What does "same rarity" constrain?
- A) The two swapped cards must be the **same rarity tier** (e.g. rare ↔ rare). (Recommended)
- B) Any rarity allowed as long as each is a duplicate (ignore rarity — but you said same rarity, so likely A).
- C) Same rarity AND same theme/category.

[Answer]: A

## Q3 — "Duplicate only" — whose side?
- A) **Only the giver's card must be a duplicate** (count ≥ 2, so they keep ≥1). Receiver may or may not already own it. (Recommended)
- B) Both cards must be duplicates for their givers (swap: A's card dup for A, B's card dup for B).
- C) Card must be a dup for giver AND new (not owned) for receiver.

[Answer]: A

## Q4 — Approval / who can trade?
- A) **Kids self-serve** — no parent approval; the constraints (dup-only, same rarity) are the safety rails. (Recommended, simplest)
- B) **Parent must approve** each trade (adds an admin approval step).
- C) Kids propose; parent approves in the admin dashboard.

[Answer]: A

## Q5 — Timing: instant or async offer?
- A) **Instant swap** — both kids at the device: active child picks their dup + the other child + the other child's card → swap happens immediately. **No migration.** (Recommended — fits shared-device model)
- B) **Async offer** — A proposes a trade, B accepts later from their profile. Needs a `trades` table (migration 0004) + pending-offer UI.
- C) Instant now, async later (phase it).

[Answer]: A

## Q6 — For a swap (if Q1=A), how is the counterparty card chosen?
- A) **A picks their dup → sees B's eligible dups of the same rarity → picks one → swap.** (Recommended)
- B) A picks their dup and just the child B; system auto-picks a random same-rarity dup from B.
- C) Both cards chosen up front by whoever is driving.

[Answer]: A

## Q7 — Where does the trade UI live?
- A) **New "Trade" screen** under the play area (e.g. `/play/trade`), entered from home/galaxy. (Recommended)
- B) Inline on the card-detail page (a "Trade this" button when it's a duplicate), like the sacrifice panel.
- C) In the admin/parent dashboard only.

[Answer]: A

## Q8 — Safety confirm step?
- A) **Show a clear confirm** ("You give X ✦rare, you get Y ✦rare — trade?") before committing. (Recommended)
- B) No confirm, immediate.

[Answer]: A

## Q9 — Edge rules (confirm defaults, note exceptions):
- Giver always keeps ≥1 copy (enforced by dup-only). ✅
- If receiver already owns the incoming card, it just increments their count (may itself become a dup). ✅
- Trade is atomic (both sides update or neither). ✅
- No trading a card with itself / same profile. ✅

[Answer]: A (accept defaults) / describe changes: A

## Q10 — Cadence
- A) **LIGHT single increment** (consistent with Inc 7–13). (Recommended if Q5=A / no migration)
- B) LIGHT-MEDIUM (if Q5=B async → migration 0004 + offer lifecycle).

[Answer]: A
