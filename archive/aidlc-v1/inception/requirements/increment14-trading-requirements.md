# INCREMENT 14 — Kid-to-Kid Card Trading

**Type**: Brownfield feature on existing Star Catchers app.
**Cadence**: LIGHT — single increment (Q10=A).
**Migration**: NONE (Q5=A instant swap — no `trades` table).
**Answers**: all A (increment14-trading-questions.md).

**Model context:** all child profiles are one household (flat `children` table, shared device). A trade is a card moving between two local sibling profiles. No cross-account / network.

---

## FR1 — Two-sided same-rarity swap (Q1=A, Q2=A)
- A trade swaps **one card from Child A for one card from Child B**, both of the **same rarity tier**.
- After the swap: A loses one copy of its card + gains one copy of B's card; B loses one copy of its card + gains one copy of A's card.

## FR2 — Duplicate-only on the giver side (Q3=A)
- The card each side gives **must be a duplicate for that giver** (`count ≥ 2`), so every giver keeps at least one copy.
- The receiving side may or may not already own the incoming card — if they do, its `count` just increments (may itself become a duplicate). No block on that.

## FR3 — Self-serve, no parent approval (Q4=A)
- Kids complete the trade themselves on the shared device. The dup-only + same-rarity rules are the safety rails. No admin/approval step.

## FR4 — Instant swap, atomic (Q5=A, Q9=A)
- The swap commits immediately in one atomic DB transaction — both collections update or neither.
- Server-authoritative: the server re-validates dup-only + same-rarity + distinct profiles + ownership at commit; the client cannot force an invalid trade.

## FR5 — Trade flow / counterparty selection (Q6=A, Q7=A)
- New **Trade screen** at `/play/trade`, reachable from the play home / galaxy.
- Flow (driven by the active child = A):
  1. A picks one of **their own duplicates** (count ≥ 2).
  2. A picks the **other child** (B) from the household.
  3. Screen shows **B's eligible duplicates of the same rarity** as A's chosen card.
  4. A picks one of B's cards → confirm → swap.

## FR6 — Confirm step (Q8=A)
- Before committing, show a clear confirmation: **"You give {A card} ({rarity}), you get {B card} ({rarity}) — trade?"** with Confirm / Cancel.

## FR7 — Edge rules (Q9=A, defaults accepted)
- Giver always keeps ≥1 copy (enforced by dup-only).
- Receiver already owns incoming card → increment count.
- Atomic — both sides or neither.
- Cannot trade with the same profile (A ≠ B) and cannot trade a card for itself.
- If A or B has no eligible same-rarity duplicate, the UI shows an empty/blocked state (nothing to trade).

---

## Non-Functional / Constraints
- **Zero new npm deps.** No migration, no seed.
- **Security:** trade is a server action re-validating all constraints atomically (dup-only, same-rarity, A≠B, both still own the cards at commit). No cross-household leakage (single household by design). Behind existing parent-login gate (play area requires parent auth session).
- **Property-Based Testing** extension enabled: the pure trade-eligibility/validation logic gets PBT (mirrors sacrifice/ticket-display precedent).
- **Resiliency:** concurrent/stale trades — re-check counts at commit inside the transaction; fail cleanly with a friendly message if a card is no longer a duplicate.
- Reduced-motion respected; reuse existing card/rarity visuals.

## Out of Scope
- Async propose/accept-later offers (Q5=B not chosen) — no `trades` table.
- One-way gifting (Q1=B not chosen).
- Cross-account / friend trading over a network.
- Parent approval workflow.

## Test Impact
- Existing 85/85 stay green.
- New PBT + unit tests for trade-eligibility (same-rarity dup filter) and the atomic swap validation (invalid trades rejected; valid swap moves exactly one copy each way; receiver increment).

## Affected Modules (indicative)
- NEW `src/features/trade/trade-logic.ts` — pure eligibility/validation (PBT).
- NEW `src/features/trade/trade-service.ts` — atomic swap (server-only, transaction).
- NEW `src/features/trade/actions.ts` — server action.
- NEW `src/features/trade/TradeFlow.tsx` — the pick→pick→pick→confirm UI.
- NEW `app/play/trade/page.tsx` — screen; entry link from `app/play/home/page.tsx`.
- Reuse: `collections` schema, `getBinder`/collection reads, `RARITY_META`, active-profile.
