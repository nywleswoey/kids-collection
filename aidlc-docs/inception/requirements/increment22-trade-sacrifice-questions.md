# INCREMENT 22 — Trade Rework (friend-first) + Galaxy Sacrifice Filter

## Requirement Verification Questions

**Intent (raw)**: "i want to change the trading process. user chooses the other party first, then the
display will show the duplicates with specific label for those that the other party don't have.
Similarly, when the other party's cards are shown, there'll be speific label for the cards that the
triggering party doesn't have. show my a quick prototype first before actual implementation.
i also want to add a quick filter at the galaxy page to quickly filter all the cards that can be sacrificed."

**Prototype verdict (2026-08-01)**: Trade = **Variant A** (swap board) with **badges on the "new"
cards only** (no label on cards the other party already has) **plus Variant B's "only show new"
filter**. Galaxy = **Variant B** (view-mode row + flat 🔥 grid).

---

## Grounding facts (verified in code + running prototype, 2026-08-01)

### Trade
- Today's flow (`src/features/trade/TradeFlow.tsx`) is `pick-mine → pick-friend → pick-theirs →
  confirm → done`. Friend-first inverts steps 1 and 2.
- Today the partner's cards are fetched **already narrowed to one rarity**
  (`getMatchesAction(friendId, rarity)` → `listMatchesForRarity`). Friend-first means no rarity is
  known at fetch time, so the server must return the partner's **whole** duplicate list plus **both
  ownership sets** — the prototype proved this with one new read-only call
  (`getPartnerViewProtoAction`) returning `{ theirDupes, theirOwnedIds, myOwnedIds }`.
- The same-rarity rule (`validateTrade`) is unchanged and stays server-authoritative; the only
  question is how the UI communicates it (prototype A dims mismatched tiles once one side is picked).
- `executeTradeAction` already takes `(aCardId, friendId, bCardId)` and derives giver A from the
  server-side active-profile cookie — **no change needed** to the commit path.
- Trading is parent-gated (`withParent`) on top of the active-child cookie.

### Galaxy / sacrifice
- Sacrifice is `SACRIFICE_COST = 3` copies (`src/features/pull/sacrifice.ts`), and the action lives
  on the **card detail page** `/play/binder/[cardId]` (`SacrificePanel`), not on a screen of its own.
  So "🔥 ready to sacrifice" is a *finder*: it must lead the child to the card detail page.
- The binder read model already carries `count` per owned card (`BinderCard`), so eligibility is
  `owned && count >= 3` — **no new server data, no migration**.
- The existing galaxy has two chip rows: category (Inc9) and rarity-with-owned-counts (Inc13),
  AND-combined. Variant B adds a third "Show" row above them.

---

## Questions

### Q1 — Default state of the trade "only show what they're missing" filters
The prototype ships both column filters **ticked on** by default, so a child lands on exactly the
cards that matter to the other party. Risk: a child may not realise more doubles exist behind the
tickbox.

A) Both filters **ON** by default (as prototyped)
B) Both filters **OFF** by default — show everything, badges do the work
C) "What they're missing" ON, "what I'm missing" OFF
D) No filter at all — badges only (drop the Variant B borrow)

[Answer]: B

### Q2 — Does the filter hide cards, or just sort them?
A) Hide (a real filter, as prototyped)
B) Keep every card visible but **sort badged cards first** — nothing is ever hidden
C) Hide, but always show a "+N more" row to reveal the rest inline

[Answer]: A

### Q3 — Same-rarity communication on the swap board
Once you pick a card on one side, the other side's mismatched rarities must be made unpickable.

A) Dim + grayscale mismatched tiles, still visible (as prototyped)
B) Hide mismatched tiles entirely once a side is picked
C) Neither — allow the pick and show a friendly error on Confirm
D) Add a rarity chip row above the board (like the galaxy's) that filters both columns at once

[Answer]: A

### Q4 — Friend picker: show per-friend "new cards" counts?
The friend strip could show, per friend, how many of your doubles they're missing (e.g. "Ben · 🎁 7").
That means loading every friend's ownership set on page load instead of one friend's on tap.

A) No — keep the friend strip plain, load on tap (as prototyped)
B) Yes — preload all friends and badge each chip with the count
C) Yes, but lazily: badge counts fill in after the page settles

[Answer]: B

### Q5 — Mobile layout for the two-column board
On a phone the two columns stack. Which order, and how much scrolling is acceptable?

A) Stack: your doubles on top, their doubles below (as prototyped)
B) Stack: their doubles on top (what you'd *get* is the motivator), yours below
C) Tabbed on mobile: "Yours | Theirs" toggle, one column at a time
D) Keep two side-by-side columns even on mobile (smaller tiles)

[Answer]: A

### Q6 — Badge wording
Prototype uses `🎁 New for {name}` on your side and `🆕 New for you` on theirs.

A) Keep as prototyped
B) Shorter: `🎁 They need it` / `🆕 You need it`
C) Something else (specify)

[Answer]: A

### Q7 — What happens to the current trade flow?
A) Replace it entirely — friend-first swap board becomes the only trade UI
B) Keep the old flow reachable from a link as a fallback
C) Replace, but keep the old code behind a feature flag for one increment

[Answer]: A

### Q8 — Galaxy "Show" row: which modes ship?
Prototype B has four: `All`, `⭐ Owned`, `➕ Doubles`, `🔥 Ready to sacrifice`.

A) All four as prototyped
B) Only `All` + `🔥 Ready to sacrifice` — the minimum that answers the request
C) `All`, `➕ Doubles`, `🔥 Ready to sacrifice` (drop Owned — the rarity counts already imply it)
D) All four, and make the row remember the child's last choice

[Answer]: B

### Q9 — Does the sacrifice view keep the category + rarity filters?
In the prototype the flat 🔥 grid respects the rarity chips but ignores category (it's global).

A) Respect rarity, ignore category (as prototyped) — the whole point is "show me everything burnable"
B) Respect both category and rarity (fully AND-combined, consistent with the rest of the galaxy)
C) Ignore both — the 🔥 view is always the complete list

[Answer]: C

### Q10 — Sacrifice view layout
A) Flat grid across all themes, no theme headers (as prototyped) — burnables are rare, grouping is noise
B) Keep theme sections, just filtered to burnable cards
C) Flat grid sorted by copies owned (most burnable first)

[Answer]: A

### Q11 — The 🔥 badge on each tile
Prototype shows `🔥 ×{sets}` (how many sacrifices that pile affords) top-left, plus the usual `×{count}`.

A) Keep both (as prototyped)
B) Just `🔥` with no multiplier — simpler for a young child
C) Show copies-until-next-sacrifice on *near-miss* cards too (e.g. `×2 — 1 more!`), as encouragement

[Answer]: B

### Q12 — Is the sacrifice filter surfaced anywhere else?
A) Galaxy page only (as requested)
B) Also a "🔥 N ready" pill on the child's home screen that deep-links into the filtered galaxy
C) Also on the Discover/pull screen next to the Easter Egg ticket balance

[Answer]: A

### Q13 — Scope split
A) One increment covering both the trade rework and the galaxy filter (they share no code)
B) Two increments — galaxy filter first (tiny, no server change), trade rework second

[Answer]: A

### Q14 — Delivery
A) Build → test → deploy to Vercel prod in this increment (the usual)
B) Build + test only; hold the deploy

[Answer]: A

### Q15 — Extensions
Carry the three enabled extensions (Security Baseline, Resiliency Baseline, Property-Based Testing)?
Note PBT applies naturally here: the "who's missing what" set logic and the sacrifice-eligibility
predicate are both pure functions.

A) Carry all three (as every prior increment)
B) Change the set (specify)

[Answer]: A
