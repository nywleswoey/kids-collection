# Increment 2 — Sensory Enhancement: Build & Test

## Build
```bash
npm run typecheck   # tsc --noEmit — clean
npm run build       # next build — 11 routes, /play/pull ≈ 5.1 kB first-load
```
Result: ✅ compiles, no new dependencies (Web Audio + CSS/WAAPI only).

## Unit / property tests
```bash
npm test                      # full suite — 33/33
npx vitest run tests/sound.test.ts   # increment-2 only — 6
```
`tests/sound.test.ts` covers:
- `sfxSpec()` valid recipe for all 8 SFX names.
- `revealIntensity()` **property**: always within [0,1]; monotonic by rarity tier; legendary = 1.
- `isBigReveal()` fires only epic/legendary.
- `settings` defaults (SFX on, BGM off) + round-trip **property** over both toggles.

Existing 27 tests must stay green (regression guard).

## Manual / behavioral test checklist (browser)
Run `npm run dev`, sign in, open the play area.

| # | Action | Expected |
|---|--------|----------|
| 1 | First tap anywhere in `/play/*` | AudioContext unlocks; BGM starts only if BGM toggle on |
| 2 | Tap "Pull a card" | click + pack-open SFX; button press scale |
| 3 | Card reveals | flip whoosh at flip, reveal sting at reveal; louder for Epic/Legendary |
| 4 | Pull Epic or Legendary | confetti burst (80 pieces legendary / 55 epic) |
| 5 | Balance changes | token counter rolls up with soft chime + pulse |
| 6 | Pull at 0 tokens | soft "denied" bump, out-of-tokens message |
| 7 | Open binder | owned slots pop in |
| 8 | Complete a theme set | set-complete fanfare + confetti (once per session) |
| 9 | Toggle 🔊 SFX off | no SFX; choice persists on reload |
| 10 | Toggle 🎵 Music | BGM starts/stops; choice persists on reload |
| 11 | Navigate between play pages | page-enter transition |
| 12 | Visit `/admin/*` and `/signin` | no SFX, no BGM, no new animation (unchanged) |

## Accessibility test
- OS → enable "Reduce Motion":
  - Confetti + count roll-up + slot-pop + page transitions do NOT animate (final state shown).
  - Audio still available but attenuated (~40%).
- Screen reader: SFX/BGM toggles expose `aria-pressed` + text labels.

## Resiliency test
- Block/disable Web Audio (or unsupported browser): app runs fully, silent — no errors surfaced.
- Missing `public/bgm/playful-loop.mp3`: BGM silent, everything else works.
- localStorage blocked (private mode): toggles still function in-session; no crash.

## Security check
- No third-party audio/network calls for SFX (synthesized locally).
- BGM source is app-local (`/bgm/…`) via `BGM_SRC` config.
- localStorage keys namespaced `kc.snd.*`; no PII.

## BGM
- Default BGM is **synthesized** (`MusicEngine.ts`, Web Audio loop) — audible with no asset.
- Optional: drop `public/bgm/playful-loop.mp3` to override the synth with a licensed track.

## Outstanding (operational)
- (Optional) supply a real royalty-free `public/bgm/playful-loop.mp3` to replace the synth loop.
