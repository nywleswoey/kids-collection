# Increment 2 — Sensory Enhancement: Code Generation Plan

Execute in order. Each `[ ]` → `[x]` immediately on completion.

## Phase A — Pure cores (test-first friendly)
- [ ] A1. `src/features/sound/settings.ts` — namespaced localStorage get/set, SSR-safe, defaults (sfx=on, bgm=off)
- [ ] A2. `src/features/sound/sfx.ts` — `SfxName`, `sfxSpec()`, `revealIntensity(rarity)` bounded/monotonic
- [ ] A3. `tests/sound.test.ts` — unit + fast-check property tests (intensity bounds/monotonicity, settings round-trip)

## Phase B — Audio runtime
- [ ] B1. `src/features/sound/AudioEngine.ts` — Web Audio singleton, lazy unlock, synth play, silent-degrade flag
- [ ] B2. `src/features/sound/bgm.ts` — HTMLAudioElement loop manager, `BGM_SRC` config, autoplay-safe
- [ ] B3. `public/bgm/README.md` + placeholder handling (documented swap point; graceful missing-file)

## Phase C — React layer
- [ ] C1. `src/features/sound/SoundProvider.tsx` — context, first-gesture unlock, reduced-motion attenuation
- [ ] C2. `src/features/sound/useSound.ts` — consumer hook
- [ ] C3. `src/features/sound/SoundControls.tsx` — SFX + BGM toggle widget (a11y: aria-pressed, labels)

## Phase D — Animation components
- [ ] D1. `src/features/anim/useReducedMotion.ts` — hook over `shouldAnimate()`
- [ ] D2. `src/features/anim/Confetti.tsx` — capped burst, transform/opacity, reduced-motion → null
- [ ] D3. `src/features/anim/CountUp.tsx` — number roll-up, reduced-motion → instant
- [ ] D4. `src/features/anim/anim.css` — keyframes: slot-pop, page-enter, press, count-pulse

## Phase E — Integration seams
- [ ] E1. `app/play/layout.tsx` (NEW) — `<SoundProvider>` + `<SoundControls/>` + page-transition wrapper
- [ ] E2. `src/features/pull/PullButton.tsx` — click/packOpen/denied/tokenChime SFX + `<CountUp/>` balance
- [ ] E3. `src/features/card/RevealCard.tsx` — flip + reveal-sting SFX + confetti on epic/legendary
- [ ] E4. `src/features/binder/CardSlot.tsx` — slot-pop class on owned
- [ ] E5. `src/features/binder/ThemeSection.tsx` — `SetCompleteCelebration` (setComplete SFX + confetti) on complete

## Phase F — Verify
- [ ] F1. `npm run typecheck` clean
- [ ] F2. `npm test` — new tests pass + existing 27 stay green
- [ ] F3. `npm run build` succeeds
- [ ] F4. Update aidlc-state.md + audit.md

## Constraints
- No new npm dependencies.
- Do not touch admin/*, signin, profiles.
- All effects gated by settings + `prefers-reduced-motion`; audio degrades silently if unavailable.
