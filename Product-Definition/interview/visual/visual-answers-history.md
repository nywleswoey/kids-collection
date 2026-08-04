# Visual Sketch — Answers History

Append-only record. The active-batch buffer `visual-questions.md` may be overwritten.

---

## V1–V5 — Visual Sketch mini-interview
**Validated**: 2026-08-03T11:41:02Z
**User edits**: V5 was transiently changed to "A" mid-edit and reverted to "B" before `ready`. Confirmed
against the on-disk file at validation time — the protocol's re-read-from-disk step resolved it, so no
clarification was needed. All five answers otherwise accepted verbatim as pre-filled.

### V1 — Persona(s)
**Answer**: **A + C** — Parent (admin) and Child (early reader, age 7). Two journeys.
**Reasoning**: the three children share one journey shape (pick profile → spend ticket → reveal → binder)
and differ by reading level, not flow, so three near-identical flowcharts would add length without
information. The age-7 early reader is the representative middle case. The parent's journey is genuinely
distinct and shares only the profile picker.

### V2 — Depth
**Answer**: **B** — happy path plus two alternative paths, 8-node cap per journey.
**Paths drawn**: *No tickets* (the moment the reward loop does its work) and *Easter egg picker* (the ~1%
pick-1-of-5 branch). A happy-path-only diagram would imply a pull always succeeds, misrepresenting the
core loop.

### V3 — Visual style
**Answer**: **C — branded**, using the real design tokens read from `app/globals.css` rather than
invented colours: `--bg-0 #050310`, `--bg-1 #0b0826`, `--bg-2 #150f3d`, `--ink #f7f5ff`,
`--brand-1 #ffd45e` (warm gold), `--brand-2 #ff6fae` (bubblegum), `--brand-3 #8b5cff` (arcade violet),
`--brand-4 #43e6c8` (mint pop). No logo file; the wordmark renders as text.
**Reasoning**: this is a brownfield sketch of a product that already has this exact palette. A greyscale
wireframe would be less faithful, not safer — the galaxy theme is load-bearing for a 4-year-old who
navigates by colour and shape rather than text.

### V4 — Sample data
**Answer**: **A — realistic**, drawn from `seed/cards.json` (Red Fox, Sea Otter, Deep Sea Creatures,
Weird Insects, Dinosaurs; the 15/8/5/2 rarity spread) and the Vision.
**Deliberate exception — privacy**: the children's real names are NOT used and must not appear. They are
absent from the Vision Document (personas are recorded by reading level, not by name), so there was
nothing to draw from, and fabricating plausible child names for a kids-app artefact would be
inappropriate. Profiles render as **Explorer 1 / 2 / 3**. Flagged to the user as changeable.

### V5 — Viewport
**Answer**: **B — Mobile (390×844).** The Vision records tablet-first for the 4-year-old and
tablet-or-phone for the 7-year-old; only the parent is on phone or laptop. One reviewable set of screens;
"Both" would double the file count for a sketch that is not a spec.

---

## Generation result
**Screens**: 13 unique nodes across both journeys → 13 HTML files + `index.html`.
**Not depicted**: trading (`/play/trade`) and quizzes (`/play/learn`) are shipped features but fall
outside both journeys as scoped in V1/V2, and the Vision classifies both as post-MVP.
**Granting tickets** is drawn as a self-edge on the admin dashboard rather than a separate node, because
it happens inline on that screen in the real app — a separate node would invent a screen that does not exist.

## Validation (visual-sketch.md Step 3 cross-check table)
| Check | Result |
|---|---|
| Journey ↔ screen list | **PASS** — 13 unique nodes, 13 HTML files, exact 1:1 |
| Edge ↔ CTA wording | **PASS** — all 18 edges appear as on-screen wording |
| Banner first child of `<body>` | **PASS** — all 14 files |
| Self-contained | **PASS** — Tailwind CDN is the only external ref; no `<link>`, no remote images |
| Sample data traceability | **PASS** — every screen carries a `<!-- source: -->` comment (2 added on re-check) |
| Style consistency | **PASS** — single shared header markup across all 14 files |
| Viewport | **PASS** — `width=390` in all files |
| Vision-only features | **PASS** — no screen depicts a feature outside the Vision |
| Index completeness | **PASS** — lists all 13 screens |
| Internal links | **PASS** — every relative href resolves to an existing file |

**Two issues found and fixed before the gate** (not presented while failing):
1. `12-manage-profiles.html` and `13-admin-child-binder.html` lacked `<!-- source: -->` comments — added.
2. Checker flagged the edge "View a child's binder" as unmatched; traced to `&rsquo;` entity encoding in
   `11-admin-dashboard.html`. Rendered text matches exactly — false positive in the checker, not a defect.

---
