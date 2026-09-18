# INCREMENT 13 — Application Design (UX Polish)

Lean design (LIGHT increment). Maps FR1–FR6 → concrete modules/data. No migration, no seed, zero new deps.
References requirements: increment13-polish-requirements.md.

---

## FR1 + FR2 — Rarity counts + filter in galaxy

**Data source:** `getBinder(childId)` already returns `ThemeSection[]` with `cards: BinderCard[]` (`{ card, owned, count }`) and `card.rarity`. No server change needed — all rarity info is client-side already in `GalaxyView`.

**New pure helper** `src/features/binder/rarity-filter.ts` (PBT-tested):
```
type RarityCount = Record<Rarity, number>;
// owned-only tally within a set of sections (respects active category filter)
countOwnedByRarity(sections: ThemeSection[]): RarityCount
// filter a section's cards to a rarity; when rarity=null → all
filterCardsByRarity(cards: BinderCard[], rarity: Rarity | null): BinderCard[]
```
- Count = owned-only (Q4.2=A): `cards.filter(c => c.owned && c.card.rarity === r).length`.
- Filtered view = ALL cards of that rarity, owned+locked (Q4.3=B): filter by `card.rarity` regardless of `owned`.

**`GalaxyView.tsx` changes:**
- Add second state `rarity: Rarity | null` (null = "All rarities", default).
- Below the existing category `<nav>` tab bar, add a **rarity chip row** (same sticky container styling; reuse `TabChip`). Chips: `All` + `Common / Rare / Epic / Legendary`, each rarity chip labelled `"{RARITY_META.label} {count}"`.
- **Count is computed from the CURRENT category selection** (Q4.2=A): `countOwnedByRarity(visible)` where `visible` = category-filtered sections. So changing the category tab re-computes the rarity counts (AND filter, Q4.1=A).
- Render: for each `visible` section, pass `filterCardsByRarity(section.cards, rarity)` into `ThemeSection`. When a rarity filter is active and a section has 0 cards of that rarity, hide that section (empty).
- Reuse `RARITY_META` from `@/features/card/rarity` for labels/colors; give active rarity chip its rarity frame color.
- `ThemeSection` needs to accept already-filtered cards — pass a shallow-cloned section `{ ...section, cards: filtered }`. No `ThemeSection` signature change.

**Test:** PBT on `rarity-filter.ts` (counts sum to owned total; filter subset invariants; empty-rarity → empty). Component smoke: chip renders count, click filters testids.

---

## FR3 — Ticket counts on manage-profile + child landing

**Manage Profiles** (`app/admin/profiles` → `ProfileRow.tsx`):
- `listChildren()` already returns `epicTickets` + `luckyTickets`; `profiles/page.tsx` currently passes only `pullTokens` to `ProfileRow`. Pass `epicTickets`/`luckyTickets` through.
- `ProfileRow` read-only summary pill: `🎟️ {pullTokens} · ✨ {epicTickets} · 🍀 {luckyTickets}` (extend existing `🎟️ {pullTokens}` pill). GrantControl/edit unchanged.

**Child landing** (`app/play/home/page.tsx`):
- Landing already surfaces a combined special-ticket pill (Inc10 FR1 via `ticket-display.ts`). Extend to show all three counts read-only in kid-friendly form: normal 🎟️, epic ✨, lucky 🍀. Reuse `specialTicketTotal` where useful; add a small display component or inline pills. Server component already has the active child's ticket fields — confirm they're passed to the landing view; if not, read from the active child.

**No new grant logic. No all-children totals row (out of scope).**

**Test:** ProfileRow renders three counts; landing shows counts. Snapshot/testid assertions.

---

## FR4 — First-duplicate sacrifice-hint modal (localStorage)

**Signal already exists:** `PullOutcome.isDuplicate` (`entry.count > 1`), and `PullButton` already renders a `duplicate-badge`. Hook here.

**New client component** `src/features/pull/SacrificeHintModal.tsx`:
- Props: `{ open, onClose, onShowMe }`.
- Dismissible modal (reuse existing panel/overlay styling). Copy (Q3.3=A):
  *"Snap! You already have this card. Got doubles? You can trade them in to power up and win a rarer card! ✨"*
- Buttons: **"Show me!"** (→ opens/links `SacrificePanel`, e.g. navigate to the binder/sacrifice entry or reveal the panel) and **"Got it"** (dismiss).

**New pure helper** `src/features/pull/sacrifice-hint.ts` (SSR-safe, guarded):
```
hintKey(childId): string                       // `sacrifice-hint-seen:${childId}`
hasSeenSacrificeHint(childId): boolean          // try/catch localStorage; false on error
markSacrificeHintSeen(childId): void            // try/catch; no-op on error
```
- Guarded for SSR (`typeof window === "undefined"` → false) and private-mode (try/catch). Failure ⇒ hint may re-show (acceptable, Q3.1=B).

**`PullButton.tsx` wiring:**
- On a pull result where `outcome.isDuplicate === true`: if `!hasSeenSacrificeHint(childId)` → open modal + `markSacrificeHintSeen(childId)`.
- Needs `childId` prop available in PullButton (active child) — thread from the page if not already present.
- Fires once per child per browser.

**Test:** `sacrifice-hint.ts` unit (key format; SSR/no-window returns false; set→get true; throw-safe). Gating logic: first duplicate opens modal, second does not.

---

## FR5 — Remove EasterEggPicker post-pick spin

**`EasterEggPicker.tsx`:** delete the decelerating roulette (the `steps`/`tick` `setTimeout` loop and `spinning` phase transition). After `pick(index)`:
- Call `claimEasterEggAction` (unchanged), then on success go **straight** to `finish()` (set active index, won card, fireworks, `revealed`, `onDone`). Remove the `"spinning"` intermediate visuals ("Spinning…") — or keep a brief non-animated "Opening…" while the server call is in flight.
- `Phase` type reduces to `"choosing" | "revealed"`.
- Reduced-motion path already went straight to `finish()` — now the default path matches it.
- **`CardRoulette.tsx` untouched** (normal pulls keep slot-machine).

**Test:** update existing EasterEggPicker test — pick → immediate reveal, no timers; assert no roulette step state.

---

## FR6 — Per-question quiz feedback

**Design decision (exposes answer key to client):** to show immediate ✓/✗ + correct answer + why without a per-question server round-trip, send the answer + explanation to the client. **Reward integrity is preserved** because the final award is still re-scored server-side against the signed `offer` (`submitQuizAction`) — the client-side key only drives display. Tradeoff: a determined user could read the DOM to always pass; accepted per Q6.2=A (kids app, educational). No change to caps/reward rules.

**Types (`types.ts`):**
- Add `explanation: string` to `QuizQuestion`.
- Change `ClientQuestion` to include the answer key + explanation for feedback:
  `ClientQuestion = QuizQuestion` (i.e. now carries `correct` + `explanation`), OR add a narrower `{ id, prompt, options, correct, explanation }`. Update `startQuizAction` to stop stripping `correct` (keep stripping nothing) — but the **offer** remains the server's own signed copy, unaffected.

**Explanation content:**
- **Math (`math-gen.ts`):** derive generically — `explanation = prompt.replace("?", String(answer))` in the shared `q()` helper. Yields "3 × 4 = 12", "95 + 5 = 100", etc. Zero per-generator authoring.
- **Grammar (`grammar-bank.ts`):** add optional `explanation?` to `mc()`. Fallback when omitted: `"The correct answer is \"${correct}\"."` Author meaningful one-liners progressively; every question still ships with a why via fallback.

**`QuizFlow.tsx` state machine:**
- Add per-question phase: after `choose(option)`, do NOT auto-advance. Set `answered[idx] = option`, show feedback panel:
  - ✓ if `option === q.correct`, else ✗ + reveal `q.correct`.
  - Show `q.explanation` one-liner.
  - **"Next"** button → advance `idx` (or submit on last question).
- Keep `picks` accumulation for the final `submitQuizAction(offer, picks)` (scoring unchanged).
- Play sound: correct → soft chime, wrong → denied (reuse existing sfx).
- End result screen unchanged.

**Test:** QuizFlow feedback state (answer → shows ✓/✗ + correct + why + Next; Next advances; last → submits). math-gen explanation derivation (PBT: explanation contains the answer). grammar-bank fallback present for every item.

---

## Cross-cutting
- **Zero new deps.** No migration. No seed.
- **PBT** (extension enabled): `rarity-filter.ts`, math explanation invariant, `sacrifice-hint.ts` key.
- **Security:** FR6 exposes quiz answer key to client — reward remains server-authoritative (signed offer re-score); documented tradeoff, no secret/env exposure. FR3 parent view behind existing parent + passcode gate.
- **Resiliency:** localStorage guarded (SSR + private mode).
- Reduced-motion paths preserved (FR2 chips static; FR5 already static reveal).
- Target: existing 77/77 stay green + new tests.

## New / changed files (indicative)
| File | Change |
|---|---|
| `src/features/binder/rarity-filter.ts` | NEW pure helper (PBT) |
| `src/features/binder/GalaxyView.tsx` | rarity chip row + filter state |
| `src/features/profiles/ProfileRow.tsx` | 3-ticket summary |
| `app/admin/profiles/page.tsx` | pass epic/lucky |
| `app/play/home/page.tsx` | landing ticket counts |
| `src/features/pull/sacrifice-hint.ts` | NEW localStorage helper |
| `src/features/pull/SacrificeHintModal.tsx` | NEW modal |
| `src/features/pull/PullButton.tsx` | duplicate → modal wiring (needs childId) |
| `src/features/pull/EasterEggPicker.tsx` | remove spin |
| `src/features/quiz/types.ts` | explanation + ClientQuestion carries key |
| `src/features/quiz/math-gen.ts` | derived explanation |
| `src/features/quiz/grammar-bank.ts` | explanation field + fallback |
| `src/features/quiz/actions.ts` | stop stripping correct for client feedback |
| `src/features/quiz/QuizFlow.tsx` | per-question feedback state |
