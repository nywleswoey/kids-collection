# Increment 2 — Sensory Enhancement: Application Design

**Status**: Ready for approval
**Depth**: Standard
**Principle**: Dependency-free (Web Audio + CSS/WAAPI), pure-logic cores for testability, all effects gated by settings + `prefers-reduced-motion`, graceful silent degrade.

## New module layout

```
public/
  bgm/
    playful-loop.mp3          # placeholder BGM — user swaps later (documented)
src/features/sound/
  settings.ts                 # PURE: read/write sfxEnabled, bgmEnabled (localStorage, namespaced)
  sfx.ts                      # PURE: SfxName → synthesis spec; rarity → sting intensity
  AudioEngine.ts              # Web Audio singleton: lazy unlock, synthesize+play SFX, silent no-op if unavailable
  bgm.ts                      # HTMLAudioElement loop manager (play/pause/volume), BGM_SRC config
  SoundProvider.tsx           # "use client" context: state + first-gesture unlock + reduced-motion attenuation
  useSound.ts                 # hook: { play, sfxEnabled, bgmEnabled, toggleSfx, toggleBgm }
  SoundControls.tsx           # "use client" toggle widget (🔊 SFX / 🎵 BGM), corner-mounted
src/features/anim/
  Confetti.tsx                # "use client" dependency-free burst (capped particles, transform/opacity)
  CountUp.tsx                 # "use client" number roll-up (rAF/WAAPI), reduced-motion → instant
  useReducedMotion.ts         # thin hook over existing shouldAnimate()
  anim.css                    # new keyframes: slot pop-in, page-enter, press, count pulse
app/play/
  layout.tsx                  # NEW: wraps play area in <SoundProvider> + <SoundControls/> + page-transition wrapper
```

## Component / module responsibilities

### settings.ts (PURE — property-testable)
- Keys: `kc.snd.sfx`, `kc.snd.bgm` (namespaced, no PII).
- `getSfxEnabled()` default `true`; `getBgmEnabled()` default `false` (BGM off until first tap per FR2).
- `set*`(bool). SSR-safe (guard `window`). Pure mapping of stored string → bool.

### sfx.ts (PURE — property-testable)
- `type SfxName = "click" | "packOpen" | "flip" | "reveal" | "tokenChime" | "denied" | "slotFill" | "setComplete"`.
- `sfxSpec(name)` → `{ type: "tone"|"noise"|"chord", freq, durationMs, envelope, gain }` — deterministic synth recipe (no files).
- `revealIntensity(rarity)` → bounded number 0..1 (common→0.3 … legendary→1.0). **Property**: output always within [0,1], monotonic by tier. → fast-check test.

### AudioEngine.ts (resiliency-critical)
- Singleton. `unlock()` creates/resumes `AudioContext` on first user gesture; if `AudioContext` missing/throws → set `available=false`, all `play()` become no-ops (NFR4 silent degrade).
- `play(name, {intensity, reducedMotion})` — builds oscillator/noise per `sfxSpec`, scales gain by intensity and reduced-motion attenuation (×0.4), auto-disconnects on end. Never throws to caller.

### bgm.ts
- Wraps one `HTMLAudioElement` (`loop=true`, `preload="none"`, `BGM_SRC` from config = `/bgm/playful-loop.mp3`, swappable).
- `start()/stop()/setMuted()`; only actually plays after unlock + bgmEnabled. Play promise rejection swallowed (autoplay policy safe).

### SoundProvider.tsx
- Holds `sfxEnabled`/`bgmEnabled` state (init from settings.ts).
- Registers one-time `pointerdown`/`keydown` listener → `AudioEngine.unlock()` + start BGM if enabled.
- `play(name, rarity?)`: no-op if `!sfxEnabled`; else `AudioEngine.play` with `revealIntensity` + reduced-motion flag.
- `toggleSfx()/toggleBgm()`: persist via settings.ts, start/stop BGM accordingly.
- Exposes context consumed by `useSound()`.

### SoundControls.tsx
- Fixed corner widget, two toggle buttons (icons + `aria-pressed`, text labels for a11y). Reads/writes via `useSound()`. Kid-reachable, not blocking gameplay.

### Confetti.tsx
- Imperative burst via `useSound`-independent trigger prop (`fire` boolean / `key`). N≤80 particles, `position:fixed` layer, transform+opacity WAAPI, auto-cleanup. `useReducedMotion()` → render nothing.

### CountUp.tsx
- `<CountUp value={n}/>` animates from previous to `n` (tabular-nums). Reduced-motion → shows final instantly.

## Integration seams (edits to existing files)

| File | Change |
|---|---|
| `app/play/layout.tsx` (NEW) | Mount `SoundProvider` + `SoundControls`; wrap `children` in page-transition div keyed on pathname (CSS `page-enter`). |
| `src/features/pull/PullButton.tsx` | On `doPull`: `play("click")` + `play("packOpen")`; on out-of-tokens tap: `play("denied")`; wrap balance in `<CountUp/>`; `play("tokenChime")` on balance increase. |
| `src/features/card/RevealCard.tsx` | `play("flip")` at flip (250ms), `play("reveal", card.rarity)` at done; fire `<Confetti/>` when rarity ∈ {epic, legendary}. |
| `src/features/binder/CardSlot.tsx` | Add `slot-pop` animation class on owned slots (CSS only — stays server component). |
| `src/features/binder/ThemeSection.tsx` | When theme `complete`, render client `SetCompleteCelebration` → `play("setComplete")` + `<Confetti/>` once on mount. |
| `src/features/binder/ProgressBar.tsx` | Unchanged (already animates width). |
| `app/globals.css` / `anim.css` | New keyframes; respect existing global `prefers-reduced-motion` kill-switch. |

**Untouched**: admin/*, signin, profiles (FR1 — play area only).

## Data / control flow (reveal example)
```
User taps Pull → PullButton.play("click","packOpen") → server pullAction →
RevealCard mounts → 250ms play("flip") → 1000ms play("reveal", rarity)
                                         → if epic/legendary: Confetti.fire
Balance changes → CountUp roll-up + play("tokenChime")
```

## NFR mapping
- **Perf (NFR3)**: transform/opacity only, particle cap ≤80, `AudioContext` lazy on gesture, BGM `preload=none`.
- **Resiliency (NFR4)**: AudioEngine `available` flag → total silent fallback; Confetti/CountUp render final state under reduced-motion.
- **Security (NFR5)**: no external audio network calls (SFX synthesized); BGM is app-local `/bgm/*`; localStorage namespaced, no PII.
- **Testing (NFR6)**: pure `settings.ts`, `sfx.ts` unit + property tests (`revealIntensity` bounds/monotonicity, settings round-trip). Existing 27 tests must stay green.

## Dependencies
**None added.** Web Audio API + `HTMLAudioElement` + CSS/WAAPI only.

## Open risks
- BGM placeholder file: ship a tiny/URL placeholder or leave `BGM_SRC` pointing to a documented empty path until user supplies `public/bgm/playful-loop.mp3`. (Code handles missing file gracefully.)
