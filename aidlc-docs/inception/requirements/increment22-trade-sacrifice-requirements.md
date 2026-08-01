# INCREMENT 22 — Requirements: Friend-First Trade Board + Galaxy Sacrifice Filter

**Status**: AWAITING APPROVAL
**Date**: 2026-08-01
**Type**: Brownfield enhancement (2 independent features, 1 increment — Q13=A)
**Cadence**: LIGHT-MEDIUM (single increment)
**Schema impact**: **None** — no migration, no seed, no new dependency
**Answers**: Q1=B, Q2=A, Q3=A, Q4=B, Q5=A, Q6=A, Q7=A, Q8=B, Q9=C, Q10=A, Q11=B, Q12=A, Q13=A, Q14=A, Q15=A
**Prototype**: `?variant=` throwaway on the real routes — Trade Variant A, Galaxy Variant B
(deleted at Code Generation; see aidlc-state.md for the file list)

---

## 1. Intent Analysis

| | |
|---|---|
| **Request type** | Enhancement (trade UX rework) + Enhancement (galaxy filter) + **Defect correction** (sacrifice-eligibility threshold, found during prototype review) |
| **Scope** | FEATURE 1: `src/features/trade/*`, `app/play/trade/page.tsx`, one new server read. FEATURE 2: `src/features/binder/GalaxyView.tsx` + one new pure module. The two features share no code. |
| **Complexity** | Moderate — the commit path (`validateTrade`, `swapCards`, `executeTradeAction`) is untouched; all change is on the read side and the UI |
| **Requirements depth** | Standard |
| **User Stories** | SKIPPED — no new persona, no new journey; this reshapes two existing screens for the existing child persona |

---

## 2. Grounding facts (verified in code, 2026-08-01)

### Trade
- Current flow: `pick-mine → pick-friend → pick-theirs → confirm → done` (`TradeFlow.tsx`).
- The partner's cards are fetched **already narrowed to one rarity** —
  `getMatchesAction(friendId, rarity)` → `listMatchesForRarity`. Friend-first means no rarity is
  known at fetch time, so the read must widen.
- `executeTradeAction(aCardId, bChildId, bCardId)` derives giver A from the server-side
  active-profile cookie, and `validateTrade` enforces distinct children / both duplicates /
  same rarity / distinct cards. **Unchanged by this increment.**
- Trade is parent-gated (`withParent`) on top of the active-child cookie.

### Sacrifice — corrected threshold
- `pull-service.ts:232` burns via `removeCard(childId, cardId, SACRIFICE_COST, SACRIFICE_COST + 1)`.
  `minHeld = 4` means **a pile of exactly 3 cannot be burned** — the child always keeps one copy.
- `app/play/binder/[cardId]/page.tsx:29` correspondingly renders `SacrificePanel` only at
  `detail.count > SACRIFICE_COST`.
- Therefore **eligibility is `count >= SACRIFICE_COST + 1` (4+), not `>= 3`**. The prototype's
  initial `>= 3` was wrong and has been corrected; the shipped code must use the 4+ rule so the
  filter can never surface a card whose detail page then refuses to offer the panel.
- Sacrificing happens **on the card detail page**, so the filter is a *finder* that must deep-link
  to `/play/binder/[cardId]`.
- `BinderCard` already carries `count`, so eligibility is derivable client-side from the existing
  binder read model — **no new server data, no migration**.

---

## 3. Functional Requirements — FEATURE 1: Friend-First Trade Board

**FR1 — Friend is chosen first.** `/play/trade` opens on a friend strip. No card can be selected
until a friend is chosen. The old card-first ordering is **removed entirely** (Q7=A) — `TradeFlow`'s
`pick-mine → pick-friend` phases are replaced, not kept behind a flag.

**FR2 — Two-column swap board.** After a friend is chosen, both inventories render side by side:
left = the active child's tradable doubles, right = the friend's tradable doubles. On viewports
narrower than `md` the columns stack with **the child's own doubles on top** (Q5=A).

**FR3 — Partner read.** One server read returns the friend's **entire** duplicate list plus both
ownership sets: `{ theirDupes, theirOwnedIds, myOwnedIds }`. It is read-only, parent-gated, and
derives the active child server-side (never from the client).

**FR4 — "New" badges, one-sided.** A tile carries a badge **only when the card is new to the other
party** (Q6=A):
- own column: `🎁 New for {friend}` when the friend does not own that card
- friend column: `🆕 New for you` when the active child does not own that card

A card the other party already owns carries **no label at all** (explicit user verdict — do not
label every card).

**FR5 — "Only show what's missing" filter.** Each column has its own checkbox that **hides**
(Q2=A) the non-badged cards. Both default **OFF** (Q1=B) — the child sees their full inventory on
arrival and opts into the narrowing. Each checkbox label carries a live count, e.g.
"Only show what Ben is missing (7/12)". When a filter empties its column, an inline hint explains
why and how to undo it.

**FR6 — Same-rarity affordance.** Once one side is picked, tiles of a different rarity in the other
column are **dimmed and greyed but stay visible** (Q3=A) and are not selectable. Server-side
`validateTrade` remains the authority.

**FR7 — Friend chips carry a "new for them" count.** Each friend chip shows how many of the active
child's doubles that friend is missing, e.g. `Ben · 🎁 7` (Q4=B). This requires every friend's
ownership set at page load, not just the tapped one.

**FR8 — Confirm and commit unchanged.** Once both sides are picked, a confirmation summary and a
commit through the existing `executeTradeAction`. Success/failure handling, sounds, PostHog events
(`trade_initiated`, `trade_completed`) and the completion-reward cascade are preserved.

## 4. Functional Requirements — FEATURE 2: Galaxy Sacrifice Filter

**FR9 — "Show" row.** A third chip row above the existing category and rarity rows, with exactly
two modes (Q8=B): `All` (default) and `🔥 Ready to sacrifice N`. The `⭐ Owned` and `➕ Doubles`
modes explored in the prototype are **not shipped**.

**FR10 — Correct eligibility.** A card is sacrifice-ready when
`owned && count >= SACRIFICE_COST + 1` (**4+ copies: 3 burned, 1 kept**). This threshold is derived
from `SACRIFICE_COST`, never hardcoded, and must agree with the card detail page's
`count > SACRIFICE_COST` gate.

**FR11 — The burn view is global.** In `🔥` mode the list **ignores both the category chip and the
rarity chips** (Q9=C) — it is always the complete set of burnable cards, so the child cannot be
misled into thinking they have fewer than they do. The chip count in FR9 is likewise global.

**FR12 — Flat grid, no theme headers.** The burn view abandons the theme-section layout for a
single flat grid (Q10=A).

**FR13 — Plain 🔥 badge.** Each burnable tile carries a plain `🔥` marker with no multiplier
(Q11=B), alongside the existing `×{count}`.

**FR14 — Deep-link to the action.** Each tile links to `/play/binder/[cardId]`, where
`SacrificePanel` performs the sacrifice. The view explains that 3 copies are burned and 1 is kept.

**FR15 — Empty state.** With nothing burnable, the view explains the 4-copy rule in child-friendly
terms rather than showing a blank grid.

**FR16 — Galaxy page only.** No sacrifice pill on home or the pull screen (Q12=A).

**FR17 — Existing filters preserved.** In `All` mode the category and rarity chip rows behave
exactly as today (Inc9 FR1 / Inc13 FR1–FR2), including owned-per-rarity counts and keeping locked
cards visible.

---

## 5. Non-Functional Requirements

**NFR1 — No schema change.** No migration, no seed, no new npm dependency.

**NFR2 — Server-authoritative trading.** The client never supplies the giver's identity. The
widened partner read exposes only card ids and counts already visible to a child who trades — no
new class of data reaches the browser. Parent gate retained. *(Security Baseline)*

**NFR3 — Pure logic, property-tested.** The "who is missing what" set logic and the
sacrifice-eligibility predicate are pure functions in their own modules with property-based tests.
Eligibility properties to hold: never true below 4 copies; always true at 4+; always agrees with
the detail page's `count > SACRIFICE_COST` gate. *(Property-Based Testing)*

**NFR4 — Read failure degrades gracefully.** A failed partner read leaves the board in a friendly
error state with the friend strip still usable; it never blanks the page or wedges the flow.
*(Resiliency Baseline)*

**NFR5 — Payload sanity.** FR7 needs every friend's ownership set. With ~300 cards per child and a
handful of children this is small, but the read must be a single batched call rather than N
sequential round trips.

**NFR6 — Accessibility.** Badges convey meaning as text plus emoji, never colour alone; chips keep
`aria-pressed`; disabled/dimmed tiles are genuinely non-interactive.

**NFR7 — No regression.** `pnpm typecheck` clean, full suite green (182 existing tests plus new
ones), `pnpm build` succeeds, no secret in the client bundle, all throwaway prototype files removed.

---

## 6. Acceptance Criteria

1. `/play/trade` shows the friend strip first; no card is selectable before a friend is chosen.
2. Each friend chip shows the count of the child's doubles that friend is missing.
3. After choosing a friend, both inventories render side by side (stacked on mobile, own cards on top).
4. A tile is badged **only** when the card is new to the other party; already-owned cards are unbadged.
5. Both "only show what's missing" checkboxes start unticked and hide non-badged cards when ticked.
6. Picking a card on one side dims (not hides) mismatched rarities on the other side.
7. A completed trade still swaps atomically and still fires the completion-reward cascade.
8. The old card-first flow is gone from the codebase.
9. `/play/binder` shows a "Show" row with `All` and `🔥 Ready to sacrifice N`.
10. A card with exactly 3 copies is **not** listed; a card with 4 copies **is**.
11. Every card in the burn view opens a detail page that actually offers `SacrificePanel` — no dead ends.
12. The burn view's contents and its chip count are unaffected by the category and rarity chips.
13. In `All` mode, category and rarity filtering behave exactly as before.
14. typecheck clean, full suite green, build succeeds, no prototype file remains.

---

## 7. Out of Scope

- Any change to `validateTrade`, `swapCards`, or the trade commit path.
- Changing `SACRIFICE_COST` itself, or where sacrificing happens.
- Multi-card / multi-copy trades, trade requests, offers, or notifications.
- Sacrifice entry points outside the galaxy page.
- Making the trade rarity rule looser or stricter.

---

## 8. Extension Compliance

| Extension | Enabled | Applicability |
|---|---|---|
| Security Baseline | Yes | **Applicable** — NFR2 (server-derived giver, parent gate, no new data class exposed) |
| Resiliency Baseline | Yes | **Applicable** — NFR4 (partner-read failure degrades gracefully) |
| Property-Based Testing | Yes | **Applicable** — NFR3 (missing-set logic + eligibility predicate are pure) |

---

## 9. Delivery

Q14=A — build → test → deploy to Vercel production within this increment. No migration and no seed
means the deploy is code-only; no post-deploy step.
