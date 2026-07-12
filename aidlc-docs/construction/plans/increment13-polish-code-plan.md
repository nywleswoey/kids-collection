# INCREMENT 13 — Code Generation Plan

LIGHT increment. No migration, no seed, zero new deps. Target: existing 77/77 stay green + new tests.
Order groups so pure helpers + tests land first, then wiring.

## FR1/FR2 — Rarity counts + galaxy filter
- [ ] Create `src/features/binder/rarity-filter.ts` — `countOwnedByRarity(sections)`, `filterCardsByRarity(cards, rarity)` (pure, SSR-safe)
- [ ] PBT + unit tests for rarity-filter (counts sum to owned; filter subset; empty rarity → empty)
- [ ] `GalaxyView.tsx` — add `rarity` state, rarity chip row (All + 4 rarities w/ owned counts from current category), filter sections' cards, hide empty sections under active rarity
- [ ] Verify RARITY_META reuse for labels/colors; testids `galaxy-rarity-{r}` / `galaxy-rarity-all`

## FR3 — Ticket visibility
- [ ] `app/admin/profiles/page.tsx` — pass `epicTickets`/`luckyTickets` to `ProfileRow`
- [ ] `ProfileRow.tsx` — read-only summary `🎟️ {n} · ✨ {n} · 🍀 {n}`
- [ ] `app/play/home/page.tsx` — show active child's normal/epic/lucky counts (read-only); confirm ticket fields reach the view
- [ ] Tests: ProfileRow renders 3 counts; landing shows counts

## FR4 — First-duplicate sacrifice hint
- [ ] Create `src/features/pull/sacrifice-hint.ts` — `hintKey`, `hasSeenSacrificeHint`, `markSacrificeHintSeen` (try/catch, SSR guard)
- [ ] Unit tests: key format; no-window → false; set→get true; throw-safe
- [ ] Create `SacrificeHintModal.tsx` — copy (Q3.3=A), "Show me!" → SacrificePanel, "Got it" dismiss
- [ ] `PullButton.tsx` — thread `childId`; on `isDuplicate` && unseen → open modal + mark seen
- [ ] Test: first dup opens modal, second does not

## FR5 — Remove easter-egg spin
- [ ] `EasterEggPicker.tsx` — remove roulette `tick`/`setTimeout` loop; Phase → `choosing|revealed`; pick → claim → straight to `finish()`
- [ ] Update existing EasterEggPicker test — immediate reveal, no timers

## FR6 — Per-question quiz feedback
- [ ] `types.ts` — add `explanation` to `QuizQuestion`; `ClientQuestion` carries `correct`+`explanation`
- [ ] `math-gen.ts` — derive `explanation = prompt.replace("?", String(answer))` in shared `q()`
- [ ] `grammar-bank.ts` — add `explanation?` to `mc()` + fallback `The correct answer is "…"`; author key one-liners where high-value
- [ ] `actions.ts` — stop stripping `correct` from client questions (offer stays server-signed)
- [ ] `QuizFlow.tsx` — per-question feedback: answer → ✓/✗ + reveal correct + why + Next; last → submit; scoring/reward unchanged
- [ ] Tests: feedback state machine; math explanation contains answer (PBT); grammar every item has explanation

## Verification (after all groups)
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` — existing 77 + new all green (x3 stable for PBT)
- [ ] `pnpm build` ✅
- [ ] Confirm zero new deps, no migration, no secret in client bundle
- [ ] Write `increment13-polish/code-summary.md`
