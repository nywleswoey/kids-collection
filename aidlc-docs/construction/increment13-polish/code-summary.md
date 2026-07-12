# INCREMENT 13 — Code Generation Summary

LIGHT increment. typecheck clean, **85/85 tests** (77 prior + 8 new), build ✅, zero new deps, no migration, no seed, no secret in client bundle.

## FR1/FR2 — Rarity counts + galaxy filter
- NEW `src/features/binder/rarity-filter.ts` — `countOwnedByRarity`, `filterCardsByRarity`, `totalOwned` (pure).
- NEW `tests/rarity-filter.pbt.test.ts` (PBT).
- `GalaxyView.tsx` — rarity chip row under category tabs; owned counts computed from current category selection (AND-filter, Q4.1); filter keeps locked cards (Q4.3=B); empty sections hidden under active rarity. Active rarity chip tinted with its frame color.

## FR3 — Ticket counts visible
- `ProfileRow.tsx` — summary pill `🎟️ n · ✨ n · 🍀 n` (new optional props epic/lucky).
- `app/admin/profiles/page.tsx` — pass `epicTickets`/`luckyTickets`.
- `app/play/home/page.tsx` — landing shows all three counts read-only (`ticket-counts` group; testids token/epic/lucky-balance).

## FR4 — First-duplicate sacrifice hint (localStorage, no migration)
- NEW `src/features/pull/sacrifice-hint.ts` — `hintKey`/`hasSeenSacrificeHint`/`markSacrificeHintSeen`, SSR + private-mode safe.
- NEW `src/features/pull/SacrificeHintModal.tsx` — kid-friendly one-time modal; "Show me!" → `/play/binder/{cardId}`, "Got it" dismiss.
- `PullButton.tsx` — new `childId` prop; effect fires modal once per child on a normal-pull duplicate reveal (after roulette). `app/play/pull/page.tsx` passes `child.id`.
- NEW `tests/sacrifice-hint.test.ts` (key, gating, SSR/error-safe).

## FR5 — Remove easter-egg post-pick spin
- `EasterEggPicker.tsx` — deleted decelerating roulette loop; Phase `choosing|revealed`; pick → claim → immediate fireworks reveal. Dropped unused `shouldAnimate` import + "Spinning…" text. CardRoulette (normal pulls) untouched.

## FR6 — Per-question quiz feedback
- `types.ts` — `QuizQuestion.explanation` added; `ClientQuestion = QuizQuestion` (now carries `correct`+`explanation`).
- `math-gen.ts` — explanation derived `prompt.replace("?", answer)` (e.g. "3 × 4 = 12").
- `grammar-bank.ts` — `mc()` optional `explanation` + fallback `The correct answer is "…"` so every item has a why.
- `quiz-service.ts` — stop stripping `correct` for the client copy (award still server-authoritative via signed offer).
- `QuizFlow.tsx` — answer → lock buttons, mark correct/wrong (green/red), show ✅/❌ + correct answer + 💡 explanation + Next/See-results button. Scoring/caps/reward unchanged.
- Tests: grammar every-Q explanation (quiz-bank), math explanation contains answer + no "?" (quiz-math-gen PBT).

## Security / NFR
- **FR6 tradeoff (documented):** answer keys now sent to client for instant feedback. Award remains server-authoritative (re-scored against signed offer in `submitQuiz`); client key drives display only. Accepted per Q6.2=A (kids app).
- AUTH_SECRET / ADMIN_PASSCODE absent from `.next/static` (verified).
- localStorage guarded; reduced-motion paths preserved.

## Files
NEW: rarity-filter.ts, sacrifice-hint.ts, SacrificeHintModal.tsx, rarity-filter.pbt.test.ts, sacrifice-hint.test.ts
EDIT: GalaxyView, ProfileRow, admin/profiles/page, play/home/page, play/pull/page, PullButton, EasterEggPicker, quiz/{types,math-gen,grammar-bank,quiz-service,QuizFlow}, tests/{quiz-bank,quiz-math-gen}

## Follow-up (optional)
- Author meaningful grammar explanations to replace the generic fallback where high-value (currently all grammar items use fallback).
