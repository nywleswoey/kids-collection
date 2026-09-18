# Increment 2 — Sensory Enhancement: Requirements Clarification

**Feature**: Add sound effects (SFX), background music (BGM), and animation to enhance the whole experience.
**Context**: Brownfield increment on the completed kids-collection card-binder app (Next.js 15 App Router, Tailwind v4, React 19). No audio libs or `public/` folder exist yet. Animation today is hand-rolled CSS + a tilt hook, all gated by `prefers-reduced-motion` / `shouldAnimate()`.

Answer each by putting your choice letter in the `[Answer]:` line. Multi-select allowed where noted. "Other" welcome — just write it.

---

## Q1 — Scope: where should effects go?
Which surfaces get sound + animation? (multi-select)

A) Card pull + reveal flow only (highest-impact: pull button, pack-open flip, rarity fanfare)
B) A + Binder (page-turn, slot-fill, set-complete chime)
C) B + Play home / navigation (hover/tap ticks, BGM)
D) Everything including sign-in and admin
E) Recommended: **B + BGM on play area only** (rich reveal, satisfying binder, ambient music while playing; leave admin/sign-in quiet)

[Answer]: E

---

## Q2 — Background music
How should BGM behave?

A) One looping playful track across the whole play area, starts muted-by-default with a visible toggle
B) One looping track, autoplay-on with a mute toggle (note: browsers block autoplay until first tap; starts on first interaction)
C) Different tracks per area (home vs pull vs binder)
D) No BGM — sound effects only
E) Recommended: **B behavior but starts on first user tap** (browser-safe), persistent mute toggle, remembers choice

[Answer]: E

---

## Q3 — Sound effects palette
Which SFX moments? (multi-select)

A) Button click / tap
B) Pull "pack opening" build-up
C) Card flip whoosh
D) Rarity reveal sting (bigger sound for Epic/Legendary)
E) Reward / token earned chime
F) Out-of-tokens soft "denied" bump
G) Binder slot fill + set-complete fanfare
H) Recommended: **all of the above** (A–G)

[Answer]: H

---

## Q4 — Animation ambition
How much new animation beyond what exists?

A) Light: polish existing (add particle burst on Legendary reveal, subtle button press, coin-count tick)
B) Medium: A + animated page transitions, binder slot pop-in, token counter roll-up, confetti on set complete
C) Heavy: B + a full pull "pack-tear" sequence, parallax backgrounds, animated mascot reactions
D) Recommended: **B (Medium)** — noticeably richer, still tasteful and performant for kids' devices

[Answer]: D

---

## Q5 — Assets: where do sound files come from?
There are no audio files in the repo yet.

A) You (Claude) generate/synthesize simple SFX programmatically (Web Audio tones/chimes) — zero external files, tiny, no licensing worry
B) I will provide my own `.mp3`/`.ogg` files; you wire up the player and I drop files into `public/sounds`
C) Use royalty-free placeholder assets you fetch/reference now, I swap later
D) Recommended: **A for SFX (synthesized, instant, licence-free) + placeholder/URL for BGM** that I can swap; keeps repo light and unblocked

[Answer]: D

---

## Q6 — Accessibility & controls
Kids' app — how strict on comfort controls?

A) Respect `prefers-reduced-motion` for animation only; audio always available behind mute
B) A + a single master mute that also stops BGM, choice persisted (localStorage)
C) B + separate SFX vs BGM toggles, and reduced-motion also lowers audio intensity
D) Recommended: **C** — parents/kids get SFX + BGM toggles, reduced-motion attenuates both, choices remembered (reuses existing `shouldAnimate()` pattern)

[Answer]: D

---

## Q7 — Animation library choice
Currently zero animation deps (hand-rolled CSS).

A) Keep it dependency-free: CSS + Web Animations API + small custom hooks (lightest bundle, matches current code)
B) Add `framer-motion` (React 19 compatible) for declarative transitions/confetti
C) Add `use-sound`/`howler` for audio + `framer-motion` for animation (most batteries-included)
D) Recommended: **A + tiny `howler` (or raw Web Audio) for audio** — minimal deps, keeps bundle small for kids' devices

[Answer]: D

---

**When done**: save this file and reply "answers ready" (or just paste your letters). I will fold answers into the requirements doc and move to the approval gate.
