# Open Questions — Vehicle Themes

- **Stage**: Join (both roles complete, barrier verified deterministically 2026-08-07T10:16:22Z)
- **Sources**: `vision-document.md` (Business) + `technical-environment.md` (Technical)
- **Barrier check**: `process-checker.cjs` → `{ business: complete, technical: complete, join: ready }`

## Summary

| | Count |
|---|---|
| Pre-declared during the interviews | 8 (5 business, 3 technical) |
| Resolved inside the approval loops | **8** |
| Raised at the join | **1** (OQ-VT-J1) |
| Accepted-and-documented, not resolved | 3 |
| **Open going into AI-DLC** | **1** |

---

## Resolved during the interviews

Recorded for traceability. None of these need AI-DLC's attention.

| ID | Question | Resolution |
|---|---|---|
| OQ-VT-1 | No checkable success criterion | None wanted — family app; drivers are rationale only |
| OQ-VT-2 | Are submarines in or out? | Submarines **and** submersibles IN |
| OQ-VT-3 | Military cap left unaffirmed | 2–3 per theme; weapons permitted, gore/violence prohibited |
| OQ-VT-4 | Theme name vs. agreed contents | Renamed **"Ocean Machines"** |
| OQ-VT-5 | Amended rule contradicts the repo-wide authoring prompt | **Global** rule change |
| OQ-VT-T1 | `seed/review/` untracked and staleness-prone | Content-addressed filenames + `--allow-unreviewed` guard |
| OQ-VT-T2 | `eduText` ≤120 unenforced | `.max(120)` in the schema (verified safe: existing max is 110) |
| OQ-VT-T3 | Remedy undefined if the completeness check fails | Re-run `--sync`; never prune; a short theme is not data loss |

---

## Contradictions found at the join

### ✅ CONTRADICTION 1 — **RESOLVED**: the vision asserted an invariant the code did not hold

| | |
|---|---|
| **Vision says** | *"No unreviewed content path to a child, ever"* — named in "What Must NOT Change", and scope item 5 is a review pass over all 60 images |
| **Technical found** | The Pollinations URL had no `seed` parameter and `--sync` regenerated rather than reusing `seed/review/`, so the parent reviewed image **A** and the child received image **B** `[image.ts:40, scripts/seed/index.ts:162-181]` |
| **Severity** | **High** — the invariant was not merely unenforced, it was actively false, and had been for all 300 existing cards |
| **Resolution** | T1(a) + Amendment 1: `--sync` publishes the reviewed bytes, review filenames are content-addressed by prompt hash, and `--sync` refuses to insert an unreviewed card without `--allow-unreviewed` |

This is the single most valuable thing the session produced, and it was only found because the vision
role's decision to permit weapons made the variance worth checking.

### ✅ CONTRADICTION 2 — **RESOLVED**: incremental authoring vs. a hard schema

| | |
|---|---|
| **Vision says** | Q7b(ii) — authoring and review are **split across multiple sessions** |
| **Technical says** | T2(c) — the schema enforces 30 cards and the exact pyramid, so `seed/cards.json` **cannot be committed half-authored** |
| **Severity** | Low |
| **Resolution** | T7a(ii) sequencing: each theme is authored to completion before it enters `cards.json`. "Split across sessions" operates at theme granularity, not card granularity |

### ⚠️ CONTRADICTION 3 — **OPEN**: see OQ-VT-J1 below

### ⚠️ CONTRADICTION 4 — **NOTED, not reopened**: policy where this project normally uses mechanism

| | |
|---|---|
| **Project stance** | The sibling `collection-safety` discovery established it explicitly: *"Policy is unenforceable; a test or CI check that fails on a destructive migration makes it real."* That reasoning drove four of its five decisions |
| **This session** | T5(c) enforces the 2–3 military cap by **human review plus a sentence in `AUTHORING_PROMPT.md`** — policy, with no mechanism |
| **Severity** | Low, and deliberately chosen |
| **Why not reopened** | T5's reasoning is sound and specific: "military" has no crisp boundary (a Coast Guard rescue helicopter, a research vessel on a naval hull, a museum carrier), so a `"military": true` schema flag would force a binary judgement on a fuzzy category and enforce it with false precision. The cap's purpose is to stop a card list *drifting*, and the authoring prompt is where steering happens |
| **Watch for** | If a future theme has a similarly fuzzy content rule, this is now a precedent. Two precedents make a pattern |

---

## Open going into AI-DLC

### OQ-VT-J1: The rarity pyramid is protected by a schema, not by a property-based test

- **Source**: cross-role — parent `technical-environment.md` (Testing) ↔ this feature's T2
- **Question**: The parent environment states that **property-based tests are REQUIRED and BLOCKING**
  for *"every invariant that protects the children's data"*, and lists the existing 14 PBT files as
  meeting that bar. The 15/8/5/2 rarity pyramid is named in this feature's "What Must NOT Change", and
  violating it makes a (theme, rarity) set-completion reward **permanently unreachable** — which
  denies a child a bonus card they would otherwise earn. That reads as squarely inside the parent's
  definition. T2 nonetheless declined the PBT (option d), on the reasoning that `loadSeed` runs the
  schema on every seed command and fails fast, so the schema *is* the gate and a PBT would be
  assurance layered on a gate that already holds.
- **Both positions are defensible.** The schema argument is genuinely strong — a fail-fast parser that
  runs unconditionally is a better guarantee than a test someone has to remember to run, especially
  given **F4** (there is no test CI, so `pnpm test` is manual anyway). The counter-argument is that the
  parent constraint says *property-based test*, not *some mechanism*, and this is the first time this
  project has answered that constraint with something other than a PBT.
- **Suggested resolution path** (AI): cheapest path is to write it — a fast-check property over
  generated seed files asserting that any file passing the schema has 30 cards and a 15/8/5/2 pyramid
  per theme, and that names are globally unique, is perhaps 30 lines and closes the question without
  anyone having to adjudicate the principle. If instead the position is that a fail-fast schema
  **satisfies** the parent's blocking constraint, that should be written into the parent
  `technical-environment.md` as an explicit carve-out — otherwise the next increment re-litigates it.
- **Priority**: low-to-medium. Nothing ships wrong either way; what is at stake is whether a declared
  blocking constraint means what it says.

---

## Accepted and documented — not questions, but do not rediscover these

1. **The reviewed bytes are machine-local.** `/seed/review/` is gitignored with zero tracked files, so
   review and publish cannot be separated across machines. Acceptable: one operator, one machine.
2. **Parent OQ-T-2 (no test CI) is untouched.** Every check this increment adds runs locally. The
   schema is the exception and is genuinely unavoidable — it runs inside `loadSeed`, on every seed
   command. `--check-urls` is opt-in and therefore only as good as the runbook.
3. **Two existing categories lose their pull-screen chips.** Dinosaurs and Superheroes, by explicit
   decision (vision Q4a). They remain fully collectable via 🎲 Random and every ticket flow.

---

## Deltas back to the parent definition

To be applied to `Product-Definition/` (the 2026-08-03 approved documents) when this increment ships:

| Target | Delta |
|---|---|
| `open-questions.md` → **OQ-B-2** | This increment produces the runway number (Blob GB + Neon rows vs. free-tier limits, ~5 MB and 60 rows per theme). Record the measurement; OQ-B-2 closes or gains a stated runway |
| `vision-document.md` → **Full Vision** | Pool grows 10 themes / 300 cards → **12 themes / 360 cards**. Update the two places this count is stated (lines ~118 and ~227) |
| `vision-document.md` → **What Must NOT Change** | New invariant: **the review→publish byte identity**. Once T1 lands, `--sync` generating a fresh image for a card that has a matching review file is a regression |
| `technical-environment.md` → **Prohibited Patterns** | New: destructive or invariant-defeating seed operations follow the `--allow-*` idiom — explicit named flag, printed blast radius, non-zero exit by default |
| `technical-environment.md` → **Testing / CI** | Correct a stale statement: the parent says *"`.github/workflows/` does not exist"*. It now contains `backup.yml` (Inc23). OQ-T-2 remains open regardless |
| Repo — `seed/AUTHORING_PROMPT.md` | The global content rule change (weapons permitted, gore/violence prohibited) applies to **all twelve themes**, not just the two new ones |
