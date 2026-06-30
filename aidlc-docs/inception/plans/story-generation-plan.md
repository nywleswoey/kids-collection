# Story Generation Plan

**Stage**: INCEPTION — User Stories (Part 1: Planning)
**Source**: `aidlc-docs/inception/requirements/requirements.md`

This plan sets *how* we'll write the user stories. Answer the few questions below (each has a recommended default — you can just confirm), then run **/aidlc:approve**. After approval I generate `stories.md` + `personas.md`.

---

## Proposed Approach (defaults)
- **Breakdown**: Hybrid — **Persona-based, then Feature-based** within each persona. Groups stories by who acts (Parent vs Child), then by feature (Pull, Binder, Card View, Rewards, Admin).
- **Format**: `As a <persona>, I want <goal>, so that <benefit>.`
- **Acceptance criteria**: **Given / When / Then** bullets per story (testable — required since Security + PBT extensions are enabled).
- **INVEST**: Stories kept Independent, Negotiable, Valuable, Estimable, Small, Testable.
- **Personas**: Parent + the three children captured as **age-tier personas** (pre-reader ~4, early reader ~7, confident reader ~9) so reading-level/UX differences are explicit.

---

## Planning Questions

## Question 1 — Story breakdown approach
A) Persona-based → Feature-based hybrid (recommended)

B) Pure Feature-based (Pull / Binder / CardView / Rewards / Admin)

C) User-journey-based (follow end-to-end flows)

X) Other (please describe after [Answer]: tag below)

[Answer]:  A

## Question 2 — Persona granularity
A) Parent + **3 age-tier child personas** (4 / 7 / 9) — captures reading-level + UX differences (recommended)

B) Parent + **1 generic Child persona** (simpler, less nuance)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Acceptance criteria format
A) Given / When / Then (recommended; testable)

B) Plain checklist of conditions

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — v1 story scope
A) **Core only** — auth+profiles, pull, binder, card view+effects, reward/token grant, minimal admin (recommended for first build)

B) Core **+ extras** — pool curation UI, token history, per-theme stats, sound effects

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Anything to add or exclude?
Free text — any story, edge case, or constraint you want represented (or "none").

[Answer]: none

---

## Execution Checklist (runs after approval — Part 2)
- [ ] Generate `personas.md` (Parent + child personas per Q2) with goals, motivations, constraints
- [ ] Generate `stories.md` grouped per approved breakdown (Q1), INVEST-compliant
- [ ] Add Given/When/Then acceptance criteria per story (per Q3), incl. negative/edge cases (zero tokens, duplicate pull, reduced-motion, unauthorized admin action)
- [ ] Map each persona to its relevant stories
- [ ] Tag stories touching Security/PBT concerns for downstream enforcement
- [ ] Update `aidlc-state.md` and `audit.md`

---

Fill the `[Answer]:` tags, save, then **/aidlc:approve**.
