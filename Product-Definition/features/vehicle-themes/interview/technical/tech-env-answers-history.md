# Tech Env Answers History — Vehicle Themes (Technical role)

Append-only. Every validated batch is recorded here verbatim, including caveats. Never rewritten or
truncated. The `tech-env-questions.md` buffer may be overwritten; this file is the durable record.

---

## Batch 1 — all 7 CORE questions (validated 2026-08-07T10:04:37Z)

Depth `quick`, interaction `batch`. Answers verbatim from `tech-env-questions.md`.
Every answer took the recommendation.

### T1 [CORE] — Close the review→publish image gap (F1)?
Options: (a) publish reviewed bytes · (b) pin a `seed` param · (c) review after publish · (d) accept · (e) other.
**[Answer]: a**
→ **`--sync` reuses `seed/review/<key>.jpg` when it exists**, generating only when it does not. The
  published image is byte-identical to the reviewed one.
→ Change lands in shared seed tooling (`scripts/seed/index.ts`), so it applies to all future themes.
→ This is what makes the vision document's *"no unreviewed content path to a child, ever"* invariant
  true in code rather than only on paper.
→ **Consequence — see OQ-VT-T1:** `seed/review/` is gitignored `[from: .gitignore]` and holds zero
  tracked files, so it becomes an untracked, machine-local input to what reaches production.

### T2 [CORE] — Which authoring rules become schema validation (F2)?
Options: (a) none · (b) shape only · (c) shape + uniqueness · (d) (c) + PBT · (e) other.
**[Answer]: c**
→ `seed-schema.ts` gains: **30 cards per theme**, the exact **15/8/5/2 rarity pyramid**, and **card
  names unique across the entire pool** (not just within a theme).
→ Not adopted: the property-based test (option d). `loadSeed` fails fast on every seed command, so the
  schema is the gate; the PBT was assurance on top.
→ Not covered by the schema: `eduText` ≤120 chars, `sourceUrl` reachability (the latter is T3).
→ **Accepted caveat:** the seed file can no longer be committed in a half-authored state. Reconciled
  by T7 a(ii) — each theme is authored to completion before it enters `cards.json`.

### T3 [CORE] — Where does the `sourceUrl` 200-check live?
Options: (a) throwaway · (b) committed CLI flag · (c) inside `loadSeed` · (d) CI · (e) other.
**[Answer]: b**
→ **`pnpm seed --check-urls`**, a committed flag run on demand before publishing.
→ `loadSeed` stays a pure, synchronous, network-free fail-fast parser. CI remains the eventual home
  once parent OQ-T-2 is closed, but is not built here.

### T4 [CORE] — Where does card authoring happen?
Options: (a) claude.ai paste · (b) in-repo with Claude Code · (c) generate then mechanically validate · (d) other.
**[Answer]: b, c**
→ **Author in-repo against `seed/cards.json`**, with all 300 existing cards visible, so the
  cross-theme name-collision rule is checkable rather than guessed at.
→ **Gate the merge** on T2's schema and T3's URL check before commit.
→ `seed/AUTHORING_PROMPT.md` still needs its content-rule edit (vision scope item 9) regardless.

### T5 [CORE] — How is the 2–3 military cap enforced?
Options: (a) human review only · (b) seed metadata flag · (c) human review + prompt · (d) (b)+(c) · (e) other.
**[Answer]: c**
→ **Human review, with the cap written into `seed/AUTHORING_PROMPT.md`** so the authoring session
  self-limits.
→ No `"military": true` seed field. "Military" has no crisp boundary (a Coast Guard rescue helicopter,
  a research vessel on a naval hull, a museum carrier), and a schema flag would enforce a fuzzy
  judgement with false precision. Nothing downstream reads it.

### T6 [CORE] — How is the OQ-B-2 runway number produced?
Options: (a) manual · (b) committed script · (c) script + threshold · (d) other.
**[Answer]: a**
→ **Manual** — read the Vercel and Neon dashboards before and after, record the figures in the
  increment doc.
→ Deliberately different from T3's answer: this is a two-point measurement of a question that
  *closes*, not a check that repeats per theme. A committed script would need Vercel and Neon API
  credentials in env — new secrets and a new failure mode for a figure read twice.
→ If the answer turns out to be tight (e.g. "room for 3 more themes"), a script plus a documented
  threshold becomes worth building then.

### T7 [CORE] — Publish mechanics against production
**[Answer]: follow recommendation** → a(ii) · b: completeness check · c: confirmed
→ **a(ii) Theme by theme**: author Flying Machines → review 30 → `--sync` → then author Ocean
  Machines and repeat. Keeps each review sitting to 30 images (matching Business Q7b-ii) and means a
  problem found in the first theme is fixed before the second is written.
→ **b) Add a completeness check.** The seed script reports `failed` counts but nothing asserts the
  final pool shape, so a partially-published theme (28 of 30, pyramid broken, set-completion quietly
  unreachable) is a silent outcome today. Runs the same shape assertion as T2, against the database
  after sync.
→ **c) Confirmed stop condition.** If `--sync` reports a pending prune or asks for a typed
  collection-row count, the run **stops** and the seed file is fixed. That prompt can only mean
  something was renamed or dropped — never proceed past it.

**Section Complete — Technical, all CORE questions** · 2026-08-07T10:04:37Z

---

## Batch 1 — Amendment 1 (2026-08-07T10:16:22Z), during the approval loop

All three pre-declared technical open questions resolved. Proposals put to the user and approved verbatim.

**Evidence gathered before proposing** (measured against `seed/cards.json`, 2026-08-07):
- Longest `eduText` across all 300 cards: **110 chars** ("World Turtle" / Mythic Creatures, and
  "Kirin" / Mythic Creatures). Zero cards exceed 120.
- Card names: **300 total, 300 unique** across all ten themes.
Both proposed schema rules therefore pass on today's file with headroom — they are forward guards,
not retro-fixes.

### OQ-VT-T1 — RESOLVED: two mechanisms
**[Answer]: approve**

**(1) Content-addressed review filenames.** The review key changes from `slug(theme-card)` to
`slug(theme-card)-<hash8>`, where `hash8` is the first 8 hex characters of
`sha256(buildPrompt(card))`. Staleness becomes impossible by construction: editing an `imagePrompt`
changes the hash, so `--sync` finds no matching file and regenerates instead of silently republishing
the image that was reviewed against the *previous* prompt. Rejecting an image remains "delete the
file, re-run `--review`".

**(2) `--sync` refuses unreviewed publishes.** Before writing, count the cards it is about to
**insert** that have no matching review file. Print them, exit non-zero, and require an explicit
`--allow-unreviewed` flag to proceed — deliberately the same shape as the existing `--allow-prune`
guard, so the seed CLI has one consistent idiom for "this needs a human decision".

**Scoping detail (load-bearing):** the check applies **only to cards that would actually be
inserted**. The 300 existing cards are skipped by `cardExists`, so they never require a review file
and no back-fill of `seed/review/` is needed.

**Accepted and documented, not fixed:** the reviewed bytes live in a gitignored, machine-local
directory, so review and publish cannot be separated across machines. Acceptable — there is one
operator and one machine.

**Effect:** the vision document's *"no unreviewed content path to a child, ever"* invariant becomes a
mechanism rather than a statement. This closes F1 completely.

### OQ-VT-T2 — RESOLVED: enforce the length
**[Answer]: approve**
→ Add `.max(120)` to `eduText` in `seed-schema.ts`. Verified safe: current maximum is 110.
→ Rationale: this is the authoring rule a 60-card session breaks without anyone noticing — an
  over-long fact overflows the card layout rather than failing.
→ Amends T2's answer, which had scoped schema work to count, pyramid, and uniqueness.

### OQ-VT-T3 — RESOLVED: remedy defined, check made unskippable
**[Answer]: approve**
→ **Placement:** the completeness check runs at the **end of `--sync`**, not as a separate command,
  with a non-zero exit code and a per-theme shape report. It cannot be forgotten.
→ **Remedy:** re-run `--sync`. It is idempotent and inserts only what is missing. **Never prune,
  never reset.**
→ **Framing, to be stated in the runbook:** a short theme is **not a data-loss event**. No child
  loses anything. The only consequence is that (theme, rarity) set-completion is unreachable until
  the theme is completed.
→ **Separation of concerns worth recording:** because T2's schema guarantees the *seed file* holds
  30 cards in a 15/8/5/2 pyramid, any post-sync shortfall is **by definition a failed insert, not an
  authoring error**. The schema catches authoring faults; the completeness check catches publishing
  faults. Disjoint failure modes, no overlap.

**Amendment 1 complete** · 2026-08-07T10:16:22Z

---
