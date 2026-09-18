# INCREMENT 24 — Requirements: Vehicle Themes (Flying Machines + Ocean Machines)

**Status**: **APPROVED 2026-08-07** — including the Finding D strengthening (§Gate)
**Date**: 2026-08-07
**Type**: Data authoring (2 themes / 60 cards) + enhancement to the offline seed CLI (4 changes) +
a repo-wide content-policy edit
**Cadence**: LIGHT-MEDIUM (single increment, two slices)
**Schema impact**: **None** — no migration, no DB schema change, no new npm dependency, no new port
method, no application code
**Source**: `Product-Definition/features/vehicle-themes/` (aidlc-discovery, 2026-08-07).
Parent `Product-Definition/{vision-document,technical-environment}.md` (2026-08-03) **not superseded**.
**Answers**: Q1=A, Q2=A, Q3=A, Q4=A, Q5=A, Q6=A, Q7=A, Q8=A
(`increment24-vehicle-themes-questions.md`)
**Open questions**: **OQ-VT-J1 CLOSED** by Q1=A (write the pyramid PBT). Parent **OQ-B-2** is
*answered* by FR21's measurement. Parent **OQ-T-2** (no test CI) and **OQ-CS-3** remain open and are
untouched here.

---

## 1. Intent Analysis

| | |
|---|---|
| **Request type** | Data authoring (items 1–2) + seed-CLI enhancement (4 changes) + global content-policy edit (item 9) + a two-point measurement (item 8) |
| **Scope** | `seed/AUTHORING_PROMPT.md`, `seed/cards.json`, `src/features/pool/seed-schema.ts`, `src/features/pool/prompt.ts`, `scripts/seed/index.ts`, NEW review-key / URL-check / completeness modules, NEW pyramid PBT, read-only pool queries |
| **Complexity** | Low-moderate. **Nothing enters the deployed request path.** No route, component, service, store, port or migration is touched |
| **User Stories** | **SKIPPED** (Q5=A) — no new persona, no new journey. Theme names appear in zero `.ts`/`.tsx` files, so the pull chips, galaxy tabs, rarity filters and set-completion rewards absorb two new themes with no code change |
| **Slices** | **A** — seed CLI, schema and tests (FR1–FR12). **B** — authoring, review, publish, measurement (FR13–FR21) |

**Scope boundary**: the vision's *MVP Scope — Features IN* table, 9 items. All 7 *Features OUT* stay
out. Both "What Must NOT Change" sections are hard boundaries.

### Scope-item → requirement map

| # | Vision scope item | Requirements |
|---|---|---|
| 9 | Amend `seed/AUTHORING_PROMPT.md` (**first**) | FR1 |
| 1 | Author 30 Flying Machines cards | FR13 |
| 2 | Author 30 Ocean Machines cards | FR14 |
| 3 | Cross-theme name-collision check | FR4 (mechanised), FR15 |
| 4 | `sourceUrl` 200-check for all 60 | FR11, FR16 |
| 5 | `--review` image pass, eyeball all 60 | FR7, FR8, FR10, FR17 |
| 6 | `--sync` publish to prod | FR9, FR12, FR18, FR19 |
| 7 | Chip-row change | FR20 (**no-op**) |
| 8 | Free-tier runway measurement | FR21 |
| — | *(technical)* schema rules + PBT | FR2–FR6 |

---

## 2. Grounding facts (verified in code, 2026-08-07)

Full detail in `increment24-vehicle-themes-questions.md` §2. The load-bearing facts:

**Re-verified against `seed/cards.json`**: 10 themes × 30 cards = 300; every theme 15/8/5/2; 300/300
unique names; longest `eduText` **110** chars, 0 over 120. All four proposed schema rules are therefore
**forward guards, not retro-fixes** — `loadSeed` will not begin failing on the committed file.

**F1 confirmed** — `generateImage` builds the Pollinations URL with no `seed` parameter
`[image.ts:40]` and `--sync` calls it again at `[index.ts:164]` rather than reading `seed/review/`.
The reviewed image and the published image are different bytes, and have been for all 300 cards.

**F2 confirmed** — `seed-schema.ts` `[1-24]` checks types, non-empty strings, the rarity enum and
`sourceUrl` being URL-*shaped*. No count, pyramid, uniqueness or length rule exists.

**F3 confirmed** — `previewPrune` runs before any write and aborts absent `--allow-prune`
`[index.ts:102-120]`. Pure addition yields an empty radius: no flag, no prompt.

**F4 confirmed** — `.github/workflows/` holds `backup.yml` only. No test CI. Parent OQ-T-2 open.

### ⚠️ Finding A — `--review` regenerates the whole pool

`mode !== "review" && (await cardExists(...))` `[index.ts:140-141]`: review mode is deliberately DB-free
and so generates an image for **every card in the seed file** — **360**, not 30. The global throttle
`[index.ts:236-242]` hands out one slot per `SEED_THROTTLE_MS` (default 3000), making a full review run
**≥18 minutes of throttle alone** plus 360 anonymous-tier calls. Both feature documents assume a
30-image sitting and neither addresses this. **FR10 fixes it (Q2=A).**

### ⚠️ Finding B — the guard and the review pass must agree by construction

`--allow-unreviewed` is scoped to *"cards about to be **inserted**"*. For an honest review sitting to
satisfy it, `--review` must generate exactly that set. FR10 and FR9 therefore compute "cards not present
in the DB" the same way, from the same read, so the guard cannot disagree with the pass meant to satisfy
it.

### ⚠️ Finding C — `seed/review/` holds 33 stale files

Untracked, machine-local, named under the old `slug(theme-card)` scheme, a remnant of a partial run.
Under FR7 they can never match a hash, so they are inert — and they are not a review record of anything.
No action; recorded so they are not mistaken for coverage.

### ⚠️ Finding D — the unreviewed-publish guard must cover `--publish`, not only `--sync`

The feature's technical-environment.md names `--sync`, but `--publish` also reaches `insertCardIfNew`
`[index.ts:174]`, and the vision's *"No unreviewed content path to a child, ever"* carries no mode
qualifier. **FR9 covers every insert path.** A strengthening of the documents' intent, not a scope
change — flagged for confirmation at this gate, in the same shape as Inc 23's FR1 strengthening.

### Constraint discovered while specifying FR9/FR10

`upsertTheme` `[writer.ts:32-49]` **writes** (it inserts the theme row and refreshes `sort_order`).
`--review` must not write, and a brand-new theme has no row yet. FR9 and FR10 therefore need a
**read-only theme lookup that returns null for an unknown theme**, treating all of its cards as new.
Which module owns that read is Application Design's call; that it must not write is a requirement.

---

## 3. Functional Requirements — Slice A: seed CLI, schema, tests

### FR1 — Amend `seed/AUTHORING_PROMPT.md` first *(scope item 9)*

`seed/AUTHORING_PROMPT.md` is edited **before any authoring session is run**, because it is the file
pasted into that session. Until it is edited, every session receives the old *"Avoid weapons, blood, or
frightening imagery"* instruction.

The amended prompt states, for **every theme, not just these two**:

| | |
|---|---|
| **Permitted** | Visible weaponry on any subject in any theme — a Spitfire's guns, a carrier's deck, a submarine's torpedo tubes |
| **Prohibited** | **Gore and violence.** Nothing firing, attacking, burning, sinking or being destroyed. No blood, injury or casualties. No combat scenes |
| **Unchanged** | "Non-scary, kid-friendly" still applies in full; spooky subjects still steer cute or comical |
| **Unchanged** | `eduText` covers engineering, exploration or history — never combat |
| **New cap** | **At most 2–3 military subjects per theme.** A *military* submarine counts; a *research* submersible (Alvin, Trieste) does not |

It also refreshes the theme-name list to all twelve and restates the ≤120-char `eduText` limit and
global name uniqueness as **schema-enforced** rather than advisory.

**Forward-looking only.** No existing card is regenerated; `--sync` never re-images an unchanged card.
The relaxation applies to the other ten themes' *future* authoring, most visibly Superheroes and Spooky
Legends — accepted knowingly (vision Amendment 2).

### FR2 — Schema: exactly 30 cards per theme

`seed-schema.ts` rejects any theme whose card array is not exactly 30. Error names the theme and the
actual count.

### FR3 — Schema: exact rarity pyramid per theme

Rejects any theme that is not exactly **15 common / 8 rare / 5 epic / 2 legendary**. Error names the
theme and the actual per-rarity counts.

### FR4 — Schema: card names globally unique across the pool *(scope item 3)*

Rejects any file where a card name appears more than once **across all themes**, not merely within one.
Error names the duplicate and both themes.

Rationale, load-bearing: `insertCardIfNew` `[writer.ts:66-77]` returns `"skipped"` on a collision — it
**swallows the fault silently**, so the theme would publish 29 cards and quietly break its own pyramid
with no error anywhere. This rule is the one a 60-card authoring session is most likely to break by
accident.

### FR5 — Schema: `eduText` ≤ 120 characters

`.max(120)` on the trimmed string. Verified safe: current maximum is 110.

### FR6 — Property-based test over FR2–FR5 *(closes OQ-VT-J1, Q1=A)*

A fast-check property asserting that a generated seed file is accepted by the schema **if and only if**
every theme has 30 cards in a 15/8/5/2 pyramid, all card names are globally unique, and no `eduText`
exceeds 120 characters. Both directions are asserted — an accepted file satisfies the invariants, and a
file violating any one of them is rejected.

Follows the repo's PBT convention: named arbitrary helpers (`cardArb`, `themeArb`, `seedFileArb`) rather
than inline generators, per `tests/sacrifice.pbt.test.ts`.

This makes the parent environment's blocking constraint — *"every invariant that protects the children's
data must be covered by a property-based test or a contract test"* — literally true for the rarity
pyramid, whose violation makes a (theme, rarity) set-completion reward permanently unreachable.

### FR7 — Content-addressed review filenames

The review key becomes `slug(<theme>-<card>)-<hash8>`, where `hash8` is the first 8 hex characters of
`sha256(buildPrompt(card))`. `node:crypto` — **no new dependency**.

Staleness becomes impossible by construction: editing an `imagePrompt` changes the hash, so no review
file matches and the image is regenerated rather than a previously-reviewed image being republished
against a prompt that has since changed.

**Accepted consequence**: `buildPrompt` appends `ART_STYLE` `[prompt.ts:9-11]`, so changing `ART_STYLE`
invalidates every hash and forces a full re-review. That is correct behaviour — the prompt genuinely
changed — and is recorded so it is not met with surprise.

Rejecting an image stays "delete the file, re-run `--review`".

### FR8 — Publish the reviewed bytes

When a review file matching the card's content-addressed key exists, `--sync` (and `--publish`) uploads
**those bytes**, and calls `generateImage` only when no matching file exists. The published image is
byte-identical to the reviewed one.

**Blob key is unchanged** (Q6=A): `uploadImage` still writes `cards/<slug(theme-card)>.jpg`
`[image.ts:80]`. The hash lives only in the review filename.

### FR9 — Refuse unreviewed publishes *(Finding D: every insert path)*

Before any write, count the cards the run would **insert** that have no matching review file. If any:
print them (theme / card), exit non-zero, and require an explicit `--allow-unreviewed` to proceed.

- Applies to `--sync` **and** `--publish` — every path reaching `insertCardIfNew`.
- Scoped to **inserts only**: the 300 existing cards are skipped by `cardExists`, so they never require
  a review file and **no back-fill of `seed/review/` is needed**.
- Deliberately the same shape as `--allow-prune` `[index.ts:105-117]`: explicit named flag, printed
  blast radius, non-zero exit by default. The seed CLI keeps **one idiom** for "this needs a human
  decision".

### FR10 — `--review` generates only what would be published *(Finding A, Q2=A)*

`--review` generates an image for a card if and only if **both**:

1. the card is not already in the database (the same "would be inserted" set FR9 checks), **and**
2. no review file matching its content-addressed key already exists.

Consequences, all accepted:

- `--review` requires `DATABASE_URL`. The early guardrail `[index.ts:71-76]` extends to review mode.
- **`--review` must remain write-free.** It performs read-only lookups; it must not call `upsertTheme`
  or any other write (see §2, "Constraint discovered").
- A run interrupted by rate limiting **resumes** rather than restarting.
- A review sitting for a new theme is 30 images, as both feature documents assume.

### FR11 — `pnpm seed --check-urls` *(scope item 4)*

A committed, on-demand flag that requests every `sourceUrl` in the seed file and reports each non-200.
Non-zero exit when any card fails. Bounded concurrency; **no DB dependency** — it is a network-only
check over the file (Q3=A).

Scope is **every card in the file** (360 after authoring), not just new ones: the existing 300 have had
the longest time to rot, and parenthesised Wikipedia suffixes 404 often enough to be worth automating.

**Not inside `loadSeed`** — see NFR4.

### FR12 — In-band completeness check at the end of `--sync`

After `--sync` finishes writing, assert the **published** pool shape per theme: 30 cards, 15/8/5/2.
Print a per-theme report; exit non-zero on any shortfall.

It runs as part of `--sync`, never as a separate opt-in command, so it cannot be forgotten.

**Disjoint from the schema, by design:**

| Check | Runs | Catches |
|---|---|---|
| `seed-schema.ts` via `loadSeed` | Before any write, on every seed command | **Authoring** faults — wrong count, broken pyramid, duplicate name, over-long fact |
| FR12 completeness check | After `--sync` writes | **Publishing** faults — a card that 429'd out and never inserted |

Because FR2–FR4 guarantee the *file* is correct, any post-sync shortfall is **by definition a failed
insert, not an authoring error** — which is what makes the documented remedy ("re-run `--sync`") always
right.

---

## 4. Functional Requirements — Slice B: authoring, review, publish

### FR13 — Author Flying Machines *(scope item 1)*

30 cards, 15/8/5/2: aircraft, balloons, airships, helicopters, rockets, **spacecraft** (ISS, Voyager,
Apollo hardware belong here — a separate Space theme is explicitly OUT). Each card carries `name`,
`eduText` (≤120 chars, true, readable by a 7-year-old, about engineering / exploration / history),
`imagePrompt` (kid-friendly, non-scary, subject only, no art-style words) and a real `sourceUrl`.

At most 2–3 military subjects.

### FR14 — Author Ocean Machines *(scope item 2)*

30 cards, same shape: surface vessels, **submarines** and **submersibles**. At most 2–3 military
subjects — a *military* submarine counts against the cap, a *research* submersible does not.

**Carried assumption, flag if wrong**: that military/research split is an assumption carried forward
from discovery rather than a resolved question.

**Watch**: the name biases authoring toward salt water. The name is a label, not a filter — a gondola or
paddle steamer is in scope. `Water Machines` remains an available fallback name.

### FR15 — Author in-repo, against the full existing pool *(scope item 3)*

Authoring happens **in-repo** with all 300 existing cards visible, not in a chat window that cannot read
`seed/cards.json`. The hardest authoring constraint is *"not already used by a card in any other
theme"*, and a session that has never read the file cannot honour it.

The merge is gated by FR4 (schema, global uniqueness) and FR11 (`--check-urls`) **before commit**.

**Accepted consequence of FR2–FR3**: `seed/cards.json` can no longer be committed half-authored. Each
theme is authored to completion before it enters the file — "split across multiple sessions" operates at
**theme** granularity, not card granularity.

### FR16 — `sourceUrl` 200-check for all 60 new cards *(scope item 4)*

`pnpm seed --check-urls` passes with zero failures before either theme is published. Delivered by FR11.

### FR17 — Human review of all 60 images *(scope item 5)*

`pnpm seed --review` for the theme, then the parent eyeballs **every** generated image, checking
kid-safety **and** the new weapons/gore boundary. 30 images per sitting.

The human review pass remains the gate. What changed is the **policy the reviewer applies**, not whether
review happens. Rejecting an image = delete the file, re-run `--review` (FR7).

### FR18 — Publish theme by theme *(scope item 6)*

```
edit AUTHORING_PROMPT.md            # FR1 — once, first
  ↓
author Flying Machines (30)  →  schema passes  →  --check-urls passes
  ↓
pnpm seed --review           →  eyeball 30 images
  ↓
pnpm seed --sync             →  publishes the reviewed bytes; FR12 must pass
  ↓
repeat for Ocean Machines
```

`--allow-prune` **must not be needed**. `--allow-unreviewed` **must not be needed**. Either being needed
is a stop condition (NFR3).

### FR19 — Themes are appended, never inserted

Both new themes are **appended** to the `themes` array in `seed/cards.json`, taking the two highest
`sort_order` values. Array position is the theme's display order `[index.ts:132-136]` and
`themes.sort_order` is a contract in the parent vision document — reordering existing entries reshuffles
what the children already know.

### FR20 — Chip row: no-op *(scope item 7)*

`MAX_PULL_CATEGORIES` stays **8**. No code change. The existing assertion at
`tests/pull-categories.pbt.test.ts:74` stays green.

**Accepted consequence** (vision Q4a): Dinosaurs and Superheroes lose their pull-screen chips, joining
Animals and Mythic Creatures. All four remain fully collectable via 🎲 Random and every ticket flow;
what is lost is the ability to *choose* them. Reversible at any time by raising the constant.

### FR21 — Free-tier runway measurement *(scope item 8 → parent OQ-B-2)*

Manual, two-point, read from the Vercel and Neon dashboards:

1. **Before** any `--sync` in this increment — Vercel Blob GB used, Neon row count. *This figure is only
   obtainable now.*
2. **After** both themes publish — the same two figures.
3. Record both, the derived **per-theme marginal cost** (expected ≈5 MB Blob and 60 rows), and the
   resulting answer to *"how many more themes fit inside the free tier"*.

**Deliberately not a script** (T6a): it is a two-point measurement of a question that closes, not a
check that repeats. A script would need Vercel and Neon API credentials in env — a new secret and a new
failure mode for a number read twice (NFR1). If the answer turns out to be tight, a script plus a
documented threshold becomes worth building *then*.

**This is not a success metric.** The vision declares **no success metrics** by explicit decision
(Q1, Amendment 1: *"family app, no need for driver"*). FR21 is a constraint check. No downstream stage
should re-derive the absence of metrics as a gap.

---

## 5. Non-Functional Requirements

**NFR1 — $0/month, strictly.** Free tiers only: Pollinations anonymous tier, Vercel Blob, Neon. **No new
npm dependency** (FR7 uses `node:crypto`). **No new secret in env** for tooling that only reports
numbers. A slow, retry-prone image run is the accepted price.

**NFR2 — Kid-safety, mechanically held.** Every published image is seen by the parent first. Previously
this was asserted and *false* (F1); FR7–FR9 make it true by construction. `--allow-unreviewed` exists
but defeats the invariant and is a stop condition in normal operation.

**NFR3 — Zero risk to `collections`.** This increment is purely additive. If `--sync` reports a pending
prune or asks for a typed collection-row count, that is a **defect in the seed file** — stop, fix the
file, do **not** pass `--allow-prune`.

**NFR4 — `loadSeed` stays pure, synchronous and network-free.** FR2–FR5 are pure in-memory checks;
FR11's URL check is a separate flag precisely so that `loadSeed` never makes a network call. Putting
360 requests behind a synchronous parser would make every seed command slow and network-dependent,
including ones that touch no URLs.

**NFR5 — The `--allow-*` idiom stays consistent.** `--allow-unreviewed` matches `--allow-prune`:
explicit named flag, printed blast radius, non-zero exit by default. A future third guard follows the
same shape.

**NFR6 — Nothing enters the request path.** No route, component, service, store, port method, migration
or application module is touched. `resetPool()` keeps having **no override parameter**.

**NFR7 — Idempotent and resumable.** `--review` and `--sync` may both be re-run after a rate-limited or
interrupted run; each picks up only what is missing. A card that 429s out is skipped, never published
half-formed.

**NFR8 — Pyramid symmetry holds in all twelve themes.** 15/8/5/2 everywhere. Reducing to 20 cards per
theme was offered during discovery and declined; per-theme rarity tuning is OUT.

**NFR9 — Review→publish byte identity.** Once FR8 lands, `--sync` generating a fresh image for a card
that has a matching review file is a **regression, not an optimisation**.

**NFR10 — Enforcement caveat (F4).** There is no test/lint CI. FR6's PBT, FR11's URL check and
`pnpm test` all run only when invoked locally. The schema (FR2–FR5) is the exception and is genuinely
unavoidable: it runs inside `loadSeed`, on every seed command. This increment does **not** close parent
OQ-T-2.

---

## 6. Acceptance Criteria

**Slice A — CLI, schema, tests**

1. `seed/AUTHORING_PROMPT.md` states the permitted/prohibited content rule and the 2–3 military cap, and
   was committed **before** any card was authored (FR1).
2. `loadSeed` rejects a theme with 29 or 31 cards, naming the theme and count (FR2).
3. `loadSeed` rejects a theme with a 16/7/5/2 split, naming the actual counts (FR3).
4. `loadSeed` rejects a file where the same card name appears in two different themes (FR4).
5. `loadSeed` rejects a card whose `eduText` is 121 characters (FR5).
6. `loadSeed` **accepts the committed `seed/cards.json` unchanged** both before and after authoring —
   the rules are forward guards (FR2–FR5).
7. The pyramid PBT passes in both directions: accepted ⇒ invariants hold; any invariant violated ⇒
   rejected (FR6).
8. Editing a card's `imagePrompt` changes its review filename, and `--sync` regenerates rather than
   republishing the old image (FR7).
9. With a matching review file present, the bytes uploaded to Blob are **byte-identical** to
   `seed/review/<key>.jpg` (FR8).
10. `--sync` and `--publish` each exit non-zero, listing the cards, when a card would be inserted with
    no matching review file; `--allow-unreviewed` proceeds (FR9, Finding D).
11. `--review` on a pool with 300 published cards and 30 new ones generates **30** images, not 360
    (FR10).
12. `--review` makes **zero writes** to the database — verified against a local DB (FR10).
13. Re-running `--review` after a partial run generates only the missing images (FR10, NFR7).
14. `--check-urls` reports every non-200 `sourceUrl` and exits non-zero; exits zero on a clean file
    (FR11).
15. `--sync` prints a per-theme completeness report and exits non-zero when a theme lands short (FR12).
16. `pnpm typecheck` clean, `pnpm test` green, `pnpm build` succeeds, **zero new dependencies**.

**Slice B — content and publish**

17. `seed/cards.json` holds **12 themes / 360 cards**, every theme 15/8/5/2 (FR13, FR14, NFR8).
18. All 360 card names are unique across the whole pool (FR4, FR15).
19. Both new themes are the **last two** entries in the `themes` array; no existing entry moved (FR19).
20. `--check-urls` passes with zero failures across all 360 cards before publish (FR16).
21. All 60 new images were eyeballed by the parent against kid-safety **and** the weapons/gore boundary,
    with at most 2–3 military subjects per theme (FR17).
22. `--sync` completed **without** `--allow-prune` and **without** `--allow-unreviewed`, with
    `prunedThemes = 0` and `prunedCards = 0` (FR18, NFR3).
23. Production Neon holds 12 themes × 30 cards, every card with a Blob `imageUrl`, every pyramid
    15/8/5/2 (FR12).
24. `MAX_PULL_CATEGORIES` is still 8 and `tests/pull-categories.pbt.test.ts` is green (FR20).
25. Blob GB and Neon row count recorded **before and after**, with the per-theme marginal cost and the
    remaining-theme runway written into the increment document (FR21).
26. No `collections` row was lost: the row count before and after `--sync` is identical (NFR3).

---

## 7. Out of Scope

Straight from the vision's *Features OUT*, all seven declined:

| Excluded | Reason |
|---|---|
| A third vehicle theme (Land Vehicles / Space) | Spacecraft ride inside Flying Machines |
| An admin UI for adding themes | JSON + CLI is adequate for a one-person, occasional workflow |
| Per-theme rarity tuning | Breaks the pyramid symmetry set-completion depends on |
| A "new category!" announcement in the child UI | Discovery-by-pulling is the intended experience |
| Retiring an old theme to hold the pool at 10 | Cascades into every child's collection — the exact hazard Inc 23 exists to prevent |
| Quiz questions for the new themes | Separate subsystem, no dependency either way |
| Raising `MAX_PULL_CATEGORIES` | Consistent with Q4a = accept |

Also out:

- **Regenerating any existing card's image.** The content-rule relaxation is forward-looking only; the
  pool is additive and `--sync` never re-images an unchanged card.
- **A `"military": true` seed field.** "Military" has no crisp boundary — a Coast Guard rescue
  helicopter, a research vessel on a naval hull, a museum carrier — so a schema flag would force a
  binary judgement on a fuzzy category and enforce it with false precision. The cap is held by the
  authoring prompt and human review. *(Noted as CONTRADICTION 4 in the feature's open-questions.md:
  policy where this project normally uses mechanism, deliberately chosen. If a future theme has a
  similarly fuzzy rule, two precedents make a pattern.)*
- **A committed usage-measurement script** (FR21 is manual — NFR1).
- **Test/lint CI.** Parent OQ-T-2 stays open.
- **Increment 23's 10 pending Product-Definition write-backs** (Q8=A).
- **Back-filling `seed/review/` for the existing 300 cards.** FR9 is insert-scoped; the 33 stale files
  already there are inert (Finding C).

---

## 8. Deltas to `Product-Definition/` (write-backs, Q8=A)

Applied at the **end** of this increment, after FR21 produces its number.

| Target | Delta |
|---|---|
| `vision-document.md` → Full Vision | Pool 10 themes / 300 cards → **12 themes / 360 cards**. Two places state this count (≈L118 "Current pool", ≈L227 "Current State") |
| `vision-document.md` → What Must NOT Change | **New invariant**: the review→publish byte identity (NFR9) |
| `open-questions.md` → **OQ-B-2** | Record FR21's measurement; OQ-B-2 closes or gains a stated runway |
| `technical-environment.md` → Prohibited Patterns | **New**: destructive or invariant-defeating seed operations follow the `--allow-*` idiom — explicit named flag, printed blast radius, non-zero exit by default |
| `technical-environment.md` → Testing / CI | Correct the stale *"`.github/workflows/` does not exist"* — it now holds `backup.yml` (Inc 23). OQ-T-2 remains open regardless |
| Repo — `seed/AUTHORING_PROMPT.md` | Delivered by FR1; recorded here as the repo-side delta: the global content rule applies to **all twelve themes** |

`Product-Definition/features/vehicle-themes/` is **not** rewritten — it is the input to this increment.

---

## 9. Extension Compliance

Feature vision's *Future Extensions (not committed)*, carried forward untouched:

- A third vehicle theme (Land Vehicles, or Space split out of Flying Machines)
- An admin UI for adding themes
- Per-theme rarity tuning
- Quiz questions for the new themes
- Revisiting `MAX_PULL_CATEGORIES` when a 13th theme makes the chip cliff bite again

Nothing in this increment forecloses any of them.

---

## 10. Delivery

**Increment number**: 24 (Q4=A). The soft-delete work pencilled in as "Increment 24" (OQ-CS-2) moves to a
later increment; the renumber is recorded in `aidlc-state.md` rather than by editing closed Increment 23
documents.

**Next stage**: Application Design (User Stories SKIPPED, Q5=A).

**Operations gate** (Q7=A): push to `main` → Vercel prod. ⚠️ With the caveat recorded in Inc 20 — **the
60 cards are live to the children the moment `--sync` writes Neon**, not at deploy. The deploy ships the
CLI changes, the seed file, the authoring prompt and the docs.

**Carried forward, unresolved**:

- Parent **OQ-T-2** — no test CI; every check here except the schema runs only when invoked locally.
- **OQ-CS-3** — general delete-path PBT, untouched.
- The **military/research** split (FR14) is a carried assumption, not a resolved question.
- **Machine-local review bytes**: `/seed/review/` is gitignored with 0 tracked files, so review and
  publish cannot be separated across machines. Acceptable: one operator, one machine.

---

## Gate

**AWAITING APPROVAL.** One item needs explicit confirmation:

> **Finding D** — FR9 applies the unreviewed-publish guard to `--publish` as well as `--sync`. The
> feature's technical-environment.md names only `--sync`; the vision's invariant carries no mode
> qualifier and `--publish` also inserts. This is a strengthening decided at Requirements stage.
