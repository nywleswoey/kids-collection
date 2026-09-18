# INCREMENT 13 — UX Polish (Rarity Counts/Filter, Ticket Visibility, Sacrifice Hint, Quiz Feedback)

**Type**: Brownfield enhancement on existing Star Catchers app.
**Cadence**: LIGHT — single increment, all 6 items in one code-gen pass (Q8=A).
**Migration**: NONE (Q7=B — first-duplicate hint via localStorage).
**Source**: increment13-polish-questions.md (answers captured, committed).

---

## FR1 — Rarity counts in galaxy (doubling as filter buttons)
*(Item 1: Q1.1=D, Q1.2=A · merged with Item 4)*

- Child **My Galaxy** view gains a **rarity chip row** below the existing category tab bar (Inc9 sticky tabs stay unchanged above).
- One chip per rarity: **Common / Rare / Epic / Legendary**, each showing the **owned count** (Q1.2=A, owned only — e.g. "Epic 3"). No "/ total".
- The rarity counts ARE the filter buttons (Q1.1=D) — see FR2. No separate standalone tally elsewhere.

## FR2 — Rarity filter in galaxy
*(Item 4: Q4.1=A, Q4.2=A, Q4.3=B)*

- Tapping a rarity chip filters the galaxy to that rarity. An "All rarities" default chip clears it.
- **Combines with the category tab (AND filter, Q4.1=A):** active category ∩ active rarity.
- **Chip count = owned count of that rarity within the current category selection** (Q4.2=A). When category = ★ All, count is owned-of-rarity across all themes; when a category is active, count reflects that category only. Counts update as the category tab changes.
- **Filtered view shows ALL cards of that rarity — owned + locked/missing slots** (Q4.3=B), so the child sees what's left to collect. (Note: count on the chip is owned-only; the view reveals the full set. Intentional — count = progress, view = goal.)
- Active-state styling consistent with existing category `TabChip`.

## FR3 — Ticket counts visible to parent (manage-profile) and child (landing)
*(Item 2: Q2.1 = "manage profile screen and the child landing page")*

- **Manage Profiles screen** (`app/admin/profiles` → `ProfileRow`): each row shows all three ticket types, not just normal tokens. Display read-only summary: **🎟️ {pullTokens} · ✨ {epicTickets} · 🍀 {luckyTickets}**. Data already returned by `listChildren` (epicTickets/luckyTickets present) — display-only change.
- **Child landing page** (`app/play/home`): show the child's own counts of all ticket types (normal + epic ✨ + lucky 🍀), read-only, kid-friendly. Extends the existing Inc10 combined special-ticket pill to also surface the normal token count clearly.
- No new grant/edit controls (GrantControl unchanged). No all-children totals row (that was Q2.1-B, not selected).

## FR4 — First-duplicate → sacrifice easter-egg hint
*(Item 3: Q3.1=B, Q3.2=A, Q3.3=A)*

- The **first time a child pulls a duplicate**, show a **dismissible one-time modal** (Q3.2=A).
- **Tracking: localStorage** (Q3.1=B / Q7=B), keyed per child (e.g. `sacrifice-hint-seen:{childId}`). Re-shows on new device / cleared storage — acceptable. **No DB migration.**
- Modal copy (Q3.3=A, kid-friendly): *"Snap! You already have this card. Got doubles? You can trade them in to power up and win a rarer card! ✨"*
- Modal has a **"Show me!"** button that opens/links to the existing `SacrificePanel`, plus a dismiss ("Got it").
- Trigger point: reveal flow detects the pulled card is already owned (duplicate) → check localStorage flag → if unset, show modal + set flag.

## FR5 — Remove easter-egg post-pick roulette spin
*(Item 5: Q5.1=A)*

- In `EasterEggPicker` (special-ticket pick-1-of-5): after the child picks a card, **skip the ~2.7s decelerating roulette spin**. Go straight to the reveal (fireworks + jackpot card) once the server claim resolves.
- **`CardRoulette` on normal pulls stays unchanged** (Q5.1=A — only the pick-1-of-5 spin removed, since the child already chose).
- Remove now-dead spin state/timers in EasterEggPicker; keep reduced-motion path (already goes straight to reveal).

## FR6 — Immediate per-question quiz feedback
*(Item 6: Q6.1=B, Q6.2=A)*

- In `QuizFlow`, after the child answers **each** question: instantly show **✓/✗**, reveal the **correct answer**, and a **one-line "why" explanation** (Q6.1=B).
- A **"Next"** button advances; the answer cannot be changed after submitting (Q6.1=B).
- **No change to scoring rules** (Q6.2=A): still one attempt, server-authoritative re-score, reward only on all-correct, daily caps unchanged. Feedback is purely educational.
- End result screen unchanged.
- **New content need:** a short "why" explanation per question. Math (procedural, `math-gen.ts`) → generate explanation alongside the generated question. Grammar (`grammar-bank.ts`) → add an `explanation` field per bank item. The correct answer is already known to the client for display (feedback is UI; the reward re-score stays server-side and authoritative).

---

## Non-Functional / Constraints
- **Zero new npm deps** (consistent with Inc 7–12).
- **No schema migration, no seed** run required.
- **Security**: no secret exposure; reward/scoring remains server-authoritative (FR6 changes UI only). Parent ticket view is behind existing parent + passcode gate.
- **Property-Based Testing** extension enabled: any new pure helper (e.g. rarity-count/filter logic) gets PBT, following `ticket-display.ts` precedent.
- **Resiliency**: localStorage access guarded (SSR-safe, try/catch, private-mode fallback = hint simply may re-show).
- Reduced-motion paths preserved.

## Out of Scope
- All-children ticket totals row (Q2.1-B not chosen).
- DB persistence of the sacrifice hint (localStorage chosen).
- Retry/re-answer in quizzes.
- Changing CardRoulette normal-pull animation.

## Test Impact
- Existing 77/77 must stay green.
- New PBT for rarity count/filter helper.
- New unit tests: ticket-count display (FR3), first-duplicate hint gating (FR4), EasterEggPicker no-spin path (FR5), quiz per-question feedback state machine (FR6).

## Affected Modules (indicative)
- `src/features/binder/GalaxyView.tsx` (+ new rarity chip row / filter), possibly new `rarity-filter.ts` pure helper.
- `src/features/profiles/ProfileRow.tsx` (FR3 admin), `app/play/home/page.tsx` (FR3 child landing).
- `src/features/pull/` — reveal duplicate detection + new `SacrificeHintModal` (FR4); `EasterEggPicker.tsx` (FR5).
- `src/features/quiz/QuizFlow.tsx`, `math-gen.ts`, `grammar-bank.ts`, `types.ts` (FR6 explanations).
