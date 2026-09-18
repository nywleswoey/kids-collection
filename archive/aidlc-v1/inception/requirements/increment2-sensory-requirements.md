# Increment 2 — Sensory Enhancement: Requirements

**Status**: Ready for approval
**Type**: Brownfield feature increment on kids-collection (Next.js 15 App Router, Tailwind v4, React 19)
**Source**: User request "add sound effects, bgm and animation to enhance the whole experience" + clarifications (increment2-sensory-clarifications.md, all recommended defaults)

## Intent
Make the play experience feel alive and rewarding for kids: satisfying pull/reveal, tactile binder, ambient music — without hurting performance or accessibility, and without heavy dependencies.

## Functional Requirements

### FR1 — Scope (Q1=E)
Effects apply to the **play area only**: pull/reveal flow + binder + play home. Admin and sign-in stay quiet (no SFX/BGM/new animation).

### FR2 — Background Music (Q2=E)
- One looping playful track for the play area.
- **Browser-safe start**: begins on first user interaction (tap/click), never violates autoplay policy.
- Persistent mute toggle; choice remembered across sessions (localStorage).
- Loops seamlessly; pauses when muted.

### FR3 — Sound Effects (Q3=H, all)
Trigger SFX on: (a) button click/tap, (b) pull pack-opening build-up, (c) card flip whoosh, (d) rarity reveal sting scaled by tier (bigger for Epic/Legendary), (e) reward/token-earned chime, (f) out-of-tokens soft denied bump, (g) binder slot-fill + set-complete fanfare.

### FR4 — Animation (Q4=D, Medium)
Beyond existing CSS effects, add:
- Particle/confetti burst on Legendary (and Epic) reveal
- Subtle button press feedback
- Animated page/route transitions in play area
- Binder slot pop-in when cards render
- Token counter roll-up (count animates to new value)
- Confetti on set-complete

### FR5 — Controls & Accessibility (Q6=D)
- Separate **SFX toggle** and **BGM toggle** (parent/kid reachable).
- `prefers-reduced-motion` reduces animation AND attenuates audio intensity.
- All choices persisted (localStorage); reuse existing `shouldAnimate()` pattern from `src/features/card/rarity.ts`.
- Default state: SFX on, BGM off-until-first-tap (per FR2).

## Non-Functional Requirements

### NFR1 — Assets (Q5=D)
- **SFX synthesized at runtime via Web Audio API** — no audio files, no licensing, tiny footprint. Deterministic tone/chime/noise-burst generators per SFX type.
- **BGM = single swappable asset**: placeholder track referenced by a config URL / `public/bgm/` path the user can replace later. Ship with a documented swap point; no large binary committed unless user provides one.
- Create `public/` folder (does not exist yet) for BGM + any future assets.

### NFR2 — Dependencies (Q7=D)
- **No animation library.** Animation via CSS + Web Animations API + small custom hooks (matches current dependency-free code).
- **Audio via raw Web Audio API** in a small custom hook/provider (no howler needed for synthesized SFX; a thin `HTMLAudioElement` handles BGM). Zero or near-zero new deps.

### NFR3 — Performance (kids' devices)
- No jank on mid/low-end mobile: prefer transform/opacity animations, `requestAnimationFrame`, cap particle counts, lazy-init AudioContext on first gesture.
- BGM streamed, not preloaded huge; SFX synthesized on demand.

### NFR4 — Resiliency (extension: enabled)
- Audio must degrade gracefully: if AudioContext unavailable/blocked, app functions silently, no errors surfaced to child.
- Reduced-motion + low-end path already exists; extend, don't break.

### NFR5 — Security (extension: enabled)
- No third-party audio CDN calls without config; no new external network dependency for SFX. BGM URL is app-controlled config.
- localStorage keys namespaced; no PII stored.

### NFR6 — Testing (extension: property-based, enabled)
- Unit-test the settings/persistence logic and SFX-selection mapping (rarity → sting intensity). Property-based where input space warrants (e.g. rarity tier → bounded intensity).

## Out of Scope
- Voice-over / narration
- Music per-track selection UI
- Admin/sign-in effects
- Committing large licensed audio files (user swaps BGM later)

## Acceptance Criteria (summary)
1. First tap in play area may start BGM (loop, mutable, remembered).
2. Each FR3 moment plays a distinct synthesized SFX; Legendary louder/richer than Common.
3. FR4 animations visible and smooth; confetti on Legendary + set-complete.
4. SFX and BGM toggles work independently and persist.
5. `prefers-reduced-motion` reduces animation and softens audio.
6. Admin/sign-in unchanged. No new heavy dependency. Build + existing 27 tests still pass.
