# Open Questions for AI-DLC — Collection Safety

Pre-declared ambiguities and unresolved decisions surfaced during definition.
AI-DLC should address these early in Requirements Analysis.

Last generated: 2026-08-05T11:24:04Z · Join barrier verified by
`aidlc-common/scripts/process-checker.cjs` (`business: complete · technical: complete · join: ready`).

Scope note: this file covers the **Collection Safety** feature. The parent
`Product-Definition/open-questions.md` remains the product-level record; see
**Deltas to the parent definition** at the end.

---

## Business (Vision) open questions

### OQ-CS-2: Soft-delete is the decided design but is not in the first slice
- **Source section**: Q3 (design decision) vs Q5 (scope IN)
- **Question**: When does soft-delete / archive for child profiles ship, and does the type-the-name
  confirmation stay afterwards or get replaced by it?
- **User's stated reasoning**: Q3 chose **b** — *"Remove hides the profile; data stays in the DB,
  restorable by the parent."* Q5 accepted a recommendation that deferred it as one of the two largest
  items in the candidate list.
- **Suggested resolution path** (AI): Not a contradiction — the type-the-name confirmation is the
  deliberate interim guard. But it means **V3 remains a hard cascading delete** through slice 1: one
  `children` row delete still cascades to `collections`, `quizCompletions` and `collectionRewards`. The
  friction is real but the blast radius is unchanged. An `archived_at` nullable column plus a filter in
  `ProfileStore.list()` is a small increment; worth scheduling immediately after slice 1 rather than
  leaving open-ended.

### OQ-CS-4: Backups and source share one vendor and one account
- **Source section**: T2 (storage) — recorded as a risk, raised by the AI
- **Question**: Is a single GitHub account holding both the source and every backup an acceptable
  concentration, given the whole feature exists to survive a catastrophic mistake?
- **User's stated reasoning**: T2 chose **a** (Actions artifacts). Consistent with Business Q6, which put
  *offsite / second-region backup copies* explicitly out of scope.
- **Suggested resolution path** (AI): This is the **same shape as a risk the parent definition already
  carries** — *"Single Google account is a single point of failure"*. The threat model this feature was
  built for is operator error, which a single destination covers completely. Account loss is a different
  threat that was deliberately scoped out. Flagged so the decision stays visible rather than forgotten;
  no action recommended within this slice. If it is ever revisited, the cheapest fix is a periodic manual
  download of one artifact, not a second automated destination.

---

## Technical (Technical Environment) open questions

### OQ-CS-3: The general delete-path property test is deferred, while PBT is a blocking constraint — ✅ **CLOSED 2026-08-12**

> **Answer: the general statement now ships, as four properties plus the concrete cases the properties
> structurally cannot reach.** The deferral reasoning was re-examined rather than inherited, as this entry
> asked, and it holds up: a narrow test was better than none. What it could not do was *say* the general
> thing, and it turns out saying it needs two homes, not one.
>
> **`tests/delete-path.pbt.test.ts`** (in-memory fake, `FC_NUM_RUNS: 1000` in CI) states scope over a
> generated world of 4 children × 4 cards — always LARGER than any operation touches, so a bystander
> exists to be harmed:
>
> - a sacrifice changes only the `(child, card)` it names, and never below the one copy the child keeps;
> - a trade changes only the four pairs it names;
> - a trade never reduces a bystander's *total* holdings (the form that catches a balanced-but-wrong move);
> - **no service path ever removes a `(child, card)` row at all** — the strong form, and true today.
>
> **`tests-pg/delete-path.pg.test.ts`** states what a fake cannot: every row that vanishes in production
> vanishes through a **cascade**. BR14 (deleting a child takes their rows and nobody else's) was
> *documented but untested* until now, and the `seed --sync` pruners had no pg coverage at all.
>
> *Recorded so it is not rediscovered*, four findings from building it:
>
> - **The pruners are not guarded the way `resetPool()` is.** `deleteThemesNotIn` / `deleteCardsNotIn`
>   cascade into `collections` with no owned-rows check; their only protection is the CLI's
>   `--allow-prune` plus a typed confirmation. **An empty keep-list deletes every theme, every card and
>   every collection row** — `pruneNotIn` reads "keep nothing" as "no filter". Pinned as behaviour with a
>   loud comment rather than changed: a prune that could not remove a dropped card would not be a prune.
>   This is the sharpest remaining edge in the delete story.
> - **Three of the four properties were vacuous when first written** and passed anyway. The four test
>   cards had four different rarities, so `validateTrade` rejected every generated trade before it reached
>   the store — green properties exercising nothing, which is this project's signature failure mode
>   wearing a new costume. Each property now counts its own writes and asserts the count is non-zero.
> - **Neither test location subsumes the other, and that was found by mutating, not by reasoning.** The
>   store's row-DELETE branch is unreachable from any service (sacrifice keeps a copy; a swap needs a
>   duplicate), so a mutation dropping `child_id` from that DELETE was missed by the properties entirely
>   and caught only by the new concrete bystander cases in the shared store contract — which also run
>   against real Postgres, where the properties deliberately do not.
> - **Every assertion here was proven to bite.** Five mutations, each reverted: `removeCard` losing its
>   `child_id` predicate, `swapCards` decrementing every holder, `sacrifice` allowed to burn a last copy,
>   `pgProfileStore.remove` losing its id predicate, and `deleteCardsNotIn` losing its theme scope. Each
>   went red, and the property failures shrank to 10–14-step counterexamples.
>
> Suite: **52 files / 329 tests** unit (was 51/321) and **7 files / 57 passed** pg (was 6/47).
- **Source section**: Business Q5 (scope) vs parent Technical Environment (Testing)
- **Question**: When does the property-based test *"no service path can delete a `collections` row it
  doesn't own"* ship, and is slice 1 acceptable without it?
- **User's stated reasoning**: Q5 accepted a recommendation deferring it as one of the two largest items.
  T7 chose **d** — a narrow test plus a "What Must NOT Change" entry — for the specific `resetPool()` case.
- **Suggested resolution path** (AI): **This is a live tension, not a preference.** The parent Technical
  Environment states Property-Based Testing is *blocking*, and Business Q4's success criterion (C) is
  *"structural, testable by a test suite"*. Slice 1 satisfies the criterion for V1 only.
  Position taken during definition: a narrow test is strictly better than none and materially better than
  blocking the whole slice on the broad one — **but that reasoning should be re-examined, not inherited.**
  Note the structural similarity to parent **OQ-T-2**: a declared-blocking rule with no mechanism behind it.

---

## Cross-Role Contradictions (vision ↔ constraints)

Produced by the join barrier once both roles completed. Checks whether the Vision Document asks for
anything the Technical Environment forbids, or vice versa.

**Result: NO CONTRADICTIONS FOUND.** One gap and one near-miss, both named below.

| Check | Vision says | Constraints say | Verdict |
|---|---|---|---|
| Cost | Strictly $0/month, free tier only (Q7) | GitHub Actions free tier; ~45 min/month of a 2,000-min allowance; Neon PITR already included; artifacts free | **Aligned** — with a note: the Actions budget is *shared*, so future CI (parent OQ-T-2) draws from the same pool |
| Backup scope | Full DB dump, no table allowlist (Q1 amended) | `pg_dump` with no `-t`; a prohibited-pattern entry forbidding table filters | **Aligned** — the constraint enforces the decision |
| Automation | Fully automated, zero touch (Q7) | Scheduled workflow, daily, unattended; `workflow_dispatch` additive only | **Aligned** |
| Verification | Success requires a restore drill, not just a backup (Q4A) | Restore-and-assert runs in the same job as the dump; a dump that can't be restored fails its own run | **Aligned** — technical side is stricter |
| Prevention | No bulk-deletion path without an explicit, named, confirmed action (Q4C) | Host detection + fresh CLI argument + typed confirmation, covering both `--reset` and `--sync` (T6d) | **Aligned** |
| V4 (destructive migrations) | Verdict: **guard** (Q2) | T7 pins `resetPool()` narrowly; the general delete-path PBT is deferred | **Gap, not contradiction** — tracked as OQ-CS-3 |
| Offsite copies | Explicitly out of scope (Q6) | Single destination (Actions artifacts) | **Aligned** — and OQ-CS-4 records the consequence |
| Alerting on destructive commands | Explicitly out of scope (Q6) | A failing restore drill surfaces as a failed Actions run, which notifies by default | **Near-miss, in the user's favour** — see below |
| Security boundaries | Untouched by this feature | Parent boundaries restated unchanged; V3 is a client-component UX change only, `withParent` gating intact | **Aligned** |
| New secret surface | Not raised by the Business role | `DATABASE_URL` becomes a GitHub Actions secret; read-only Neon role recommended; repo privacy becomes a security property | **No conflict** — a technical addition with no business counterpart, recorded so it isn't discovered later |

### The one near-miss worth naming

Business Q6 put *"alerting when a destructive command runs"* out of scope. The technical design does not
add alerting — but T5's automated restore drill means a **failed or corrupt backup** produces a failed
GitHub Actions run, which notifies by default. So the feature incidentally delivers alerting for the
failure mode that matters most, at zero cost and without expanding scope. Recorded because it is easy to
mistake for scope creep later and remove.

---

## Summary

Total open questions: 2  (Business: 1, Technical: 1) — OQ-CS-3 closed 2026-08-12.
Cross-role contradictions: 0 · Gaps: **0** (OQ-CS-3 closed) · Near-misses: 1 (alerting, in the user's favour)

**Priority order**:
1. **OQ-CS-2** (soft-delete) — V3's blast radius is unchanged until it ships; small increment.
2. **OQ-CS-4** (single vendor) — deliberately scoped out; no action, keep visible.

~~**OQ-CS-3** (general delete-path PBT) — the only item where a *blocking* parent constraint is not met.~~
**Closed 2026-08-12.** The blocking PBT constraint is now met for the delete path specifically, not just
mechanised in general by parent OQ-T-2. One thing it surfaced is worth carrying into any future work on
the seed pipeline: the `seed --sync` pruners have **no structural guard**, and an empty keep-list deletes
every collection row.

---

## Resolved during this session — not carried

| ID | Resolution |
|---|---|
| ~~**OQ-CS-1**~~ — which tables count as irreplaceable | **RESOLVED 2026-08-05.** The backup is a **full DB dump**, so `quizCompletions`, `collectionRewards` and every future table are covered by consequence rather than by an allowlist that can drift. Number not reused, per the monotonic numbering rule |

---

## Deltas to the parent definition

Write-backs this feature produces for `Product-Definition/`. **Not yet applied** — the parent documents
remain exactly as approved on 2026-08-03.

### 1. Parent OQ-B-1 → RESOLVED

Parent `open-questions.md` lists **OQ-B-1** (*"No known backup or restore path for the children's
collections"*) as priority 1, *"the only item where the downside is irreversible data loss"*, and notes the
evidence was *an assertion of absence*.

It is now answered on both halves:
- **Neon PITR exists, with a 6-hour retention window** (T4, verified in the Neon dashboard).
- **A nightly full `pg_dump` with a 90-day retention and an automated restore drill** is specified
  underneath it (T1, T2, T3, T5).

Resulting coverage — worth carrying into the parent verbatim:

| Time since the mistake | Covered by | Loss |
|---|---|---|
| 0–6 h | Neon PITR | ~none |
| 6–24 h | Last nightly dump | up to 24 h of pulls |
| > 24 h, up to 90 days | Older nightly dumps | up to 24 h of pulls, from that day |
| > 90 days | **Nothing** | total |

### 2. Additions to the parent's "What Must NOT Change"

- A pool reset must never delete `collections` rows.
- Destructive seed operations must detect production and require a fresh, typed confirmation — never an
  environment variable.
- The backup must be a full dump; no `-t` table allowlist, ever.
- The restore drill runs on every backup run.

### 3. Parent risk register

- *"No known backup / restore path"* (currently **High**) → downgrade once slice 1 ships, replaced by the
  narrower residual risks: the 6–24 h point-in-time gap, the 90-day horizon, and OQ-CS-4.
- **Add**: `DATABASE_URL` now exists as a GitHub Actions secret; repository privacy becomes a security
  property rather than a preference, because artifacts contain a full production database copy.

### 4. Parent OQ-T-2 — unchanged, but its blocker is gone

`.github/workflows/` does not exist today; this feature creates it. The parent's declared-but-unenforced
CI gates have been waiting on exactly that. **Not scoped in here** — adding CI gates is a separate
decision — but the marginal cost of a second workflow file is now near zero.
