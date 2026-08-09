# Open Questions for AI-DLC

Pre-declared ambiguities and unresolved decisions surfaced during definition.
AI-DLC should address these early in Requirements Analysis.

Last generated: 2026-08-03T11:16:45Z

## Business (Vision) open questions

### OQ-B-1: No known backup or restore path for the children's collections
- **Source section**: Risks / What Must NOT Change
- **Question**: Does any backup or point-in-time restore exist for the Neon Postgres database today? If
  not, what is the cheapest adequate insurance — Neon PITR on the current plan, or a scheduled `pg_dump`?
- **User's stated reasoning**: Not user-raised. Surfaced during this interview and left unverified. The
  user's own hard boundary (QB2 item 1) is that `collections` rows — every pull the children have ever
  made — must never be lost, yet no mechanism enforcing that was found in the repo.
- **Suggested resolution path** (AI): Check the Neon project's plan and retention settings directly; this
  cannot be answered from the repo. **Note the evidence is an assertion of absence** — the AI searched and
  found nothing, which is weaker than confirming none exists. Resolve before any migration touching
  `collections`, `children`, or `cards`. **Highest-stakes item in this file.**

### OQ-B-2: Does the $0/month cost target survive an ever-growing card pool? — ✅ **CLOSED 2026-08-07**

> **Answer: yes, and storage is not the binding constraint.** Measured either side of Increment 24's
> pool growth (10 themes/300 cards → 12 themes/360 cards): Vercel Blob went 25.48 MB → **28.29 MB**
> against a **1 GB** free tier, and Neon holds ~1,038 rows of short text against a storage-bounded
> (not row-bounded) free tier. The marginal cost of a theme is **≈1.4 MB of Blob and 30 rows**
> (≈2.5 MB taking the older, more textured images as the conservative case).
>
> That leaves room for roughly **400–700 more themes** before Blob's free tier fills — a thirty-fold
> increase on today's pool. The limits on this project are the parent's authoring time and the
> children's appetite, not the free tier. Full figures:
> `aidlc-docs/construction/build-and-test/increment24-vehicle-themes-build-and-test.md` §2.
>
> *Recorded so it is not rediscovered*: Blob holds 13 orphaned objects (373 for 360 cards),
> pre-existing and not created by Increment 24. `uploadImage` writes before `insertCardIfNew`, so a
> card uploaded but never inserted leaves its object behind. Under 1 MB; not worth tooling.

- **Source section**: Success Metrics / Full Scope Vision
- **Question**: The single success metric fixes runtime cost at $0/month held flat (Q10), while the pool
  is explicitly intended to keep growing (Q18). At what pool size do Neon rows or Vercel Blob storage
  cross a free-tier boundary, and which position gives way when they collide?
- **User's stated reasoning**: Verbatim — *"pool keeps growing"*. Combined with Q5, verbatim —
  *"I don't need other metrics."*
- **Suggested resolution path** (AI): Derived tension, not a v1 item — both positions are individually
  sound and hold comfortably at today's 300 cards. Quantify current Blob and Neon usage against free-tier
  limits, extrapolate per-theme (30 cards + 30 images), and report the crossover pool size. A number turns
  this from a conflict into a known runway.

### OQ-B-3: Problem statement and vision statement are AI-reconstructed, not user-authored
- **Source section**: Problem Statement / Product Vision Statement
- **Question**: Do the Problem Statement (Q6) and Product Vision Statement (Q11) actually reflect the
  user's intent, or merely a plausible reconstruction of it?
- **User's stated reasoning**: None given — both were accepted verbatim as pre-filled. The v1 corpus
  contains neither: `requirements.md` opens directly into solution decisions with no prose problem
  statement, and no vision statement exists anywhere.
- **Suggested resolution path** (AI): Treat both as lower-confidence than the rest of the document. They
  are the two sections most likely to be quietly wrong, because nothing in the source material constrains
  them. Worth one confirming question at the start of Requirements Analysis before anything is built on them.

## Technical (Technical Environment) open questions

### OQ-T-2: CI gates are declared but not enforced — ✅ **CLOSED 2026-08-09**

> **Answer: the four declared gates now run automatically on every pull request, and branch protection
> makes them binding.** `.github/workflows/ci.yml` supplies two checks — **`fast-gate`** (`typecheck`,
> `pnpm test`, `build`) and **`pg-gate`** (`pnpm pg:up` + `pnpm test:pg`) — on `pull_request` and on
> `push: main`, with **no secrets at all**. The repository ruleset **`main protection`** requires a pull
> request plus both checks, restricts deletions, blocks force-pushes and requires linear history.
>
> **The block is branch protection, not a Vercel change.** Vercel's push-to-`main` deploy trigger is
> untouched; `main` only advances through a green PR, so gating what reaches `main` gates the deploy.
>
> **The blocking PBT constraint is now mechanism, not discipline** — and at greater depth than a local
> run: CI sets `FC_NUM_RUNS: 1000`, ten times fast-check's default, so a run explores ~100,000 cases
> across 100 `fc.assert` sites. `pnpm test:pg` was moved to **every PR** rather than "when the persistence
> layer changes", because a path-filtered job that is *skipped* never reports and would leave a required
> check pending forever.
>
> **The bypass list is empty**, deliberately: a "repository admin" entry would have exempted 100% of the
> humans the rule governs, which is the shape of non-enforcement this question was raised about. Proven to
> bite rather than assumed — a direct admin push to `main` was rejected with `GH013`, and each of the four
> gates was deliberately broken and observed to go red for its own reason.
>
> *Recorded so it is not rediscovered*: **lint was consciously ruled out**, not forgotten — `next lint` is
> deprecated, no ESLint config or dependency exists, and adopting it would have blocked this closure
> behind an unbounded cleanup. The repo's hanging `lint` script was removed rather than wired up.
> **Signed commits are deliberately not required** on `main`: the 1Password SSH agent is flaky, so the
> rule would convert every flake into an unmergeable PR with no bypass — and a squash-merge is signed
> server-side by GitHub regardless. Fixing the signing setup is a separate effort.
>
> Full detail: `technical-environment.md` → *Testing → CI/CD Gates*, and the heavily-commented
> `.github/workflows/ci.yml`.

- **Source section**: Testing — CI/CD Gates (T25)
- **Question**: When should the declared gates (`typecheck` → `test` → `build`, plus `test:pg` on
  persistence changes) become an actual GitHub Actions workflow?
- **User's stated reasoning**: Verbatim — *"fill 25 as ii. will automate later on."* The user chose to
  record the intent to automate rather than the manual status quo, and deferred the implementation.
- **Suggested resolution path** (AI): `.github/workflows/` does not exist; the gates are real but run by
  hand and nothing blocks a deploy that skipped them. The specific exposure: **Property-Based Testing is a
  BLOCKING constraint** carried from Business Q9, so until automation exists that blocking rule is
  enforced only by developer discipline. A single workflow running the four existing `package.json`
  scripts on push/PR closes it. Low effort, and it is the cheapest way to make a blocking constraint real.

### OQ-T-3: `next-auth` is pinned to a beta release on the only security boundary
- **Source section**: Existing Language Inventory (TB1)
- **Question**: What is the upgrade path for `next-auth@5.0.0-beta.25`, and what would a stable-release
  migration involve?
- **User's stated reasoning**: Not user-raised — surfaced by the AI while inventorying the stack.
- **Suggested resolution path** (AI): Not a defect. Auth.js v5 has been in beta a long time and is widely
  used in production. But this is the single dependency sitting on the system's only real security
  boundary (parent Google OAuth + the fail-closed allowlist), so its upgrade deserves deliberate attention
  rather than a routine bump. Check whether a stable v5 has shipped and what the migration entails before
  any auth-adjacent work.

### Resolved during this session — not carried
- ~~**OQ-T-1**: `allowJs: true` meant the T7 JavaScript prohibition was convention, not mechanism.~~
  **RESOLVED 2026-08-03** — the user chose enforcement; `tsconfig.json` now sets `"allowJs": false` and
  `pnpm typecheck` passes clean. Number not reused, per the collector's monotonic numbering rule.

## Cross-Role Contradictions (vision ↔ constraints)

Produced by the join barrier once both roles completed. Checks whether the Vision Document asks for
anything the Technical Environment forbids, or vice versa.

**Result: NO CONTRADICTIONS FOUND.**

| Check | Vision says | Constraints say | Verdict |
|---|---|---|---|
| Cost | Single success metric: $0/month runtime cost, held flat | Deny-list bans any metered/paid service and any runtime LLM/image SDK | **Aligned** — the constraint enforces the metric |
| Kid-safety | Inviolable: no unreviewed content path to a child | Prohibited at library level (no runtime generation SDK) and pattern level (TB3: no runtime generation into a child-facing path) | **Aligned** — expressed as enforceable prohibitions |
| Scale / uptime | Explicit non-goals: no scalability target, no uptime SLO | No queues, no cache, no orchestration, no second datastore | **Aligned** — nothing is over-engineered for absent load |
| Data protection | QB2 item 1: children's collection data above all else | TB2 restates it and adds the migration-level rule + five named CHECK constraints | **Aligned** — technical side is stricter |
| Auth boundary | QB2 item 5: profile selection is NOT a security boundary | Restated verbatim, plus the fail-closed `signIn` allowlist and two-layer admin gate | **Aligned** |
| Testing rigour | PBT is a blocking constraint | 22 PBT files + 5 dual-adapter contract specs exist, and since 2026-08-09 a **required CI check runs them on every PR** | **Aligned** — the gap that was OQ-T-2 is closed |
| Compliance | No framework applies (private family app) | Encryption at rest and in transit; multi-tenancy on the deny list | **Aligned** — and the deny-list entry is what keeps "no framework" true |

**Full QB2 vs TB2 item-by-item comparison**: `interview/technical/tech-env-answers-history.md`
§"CROSS-ROLE CHECK". TB2 was found to be a strict technical superset of QB2 — every business invariant
has a technical restatement, and the technical role added enforcement detail without weakening any.

**One near-miss worth naming**: testing rigour was the only place the two roles didn't fully meet. The
Business role declared Property-Based Testing *blocking*; the Technical role found nothing enforces it.
That was a gap between stated and enforced, not a conflict between the two documents — and it is the gap
OQ-T-2 existed to close. **Closed 2026-08-09**: `fast-gate` is a required status check on `main`, so a
pull request whose properties fail cannot be merged. The row above now reads *Aligned* for that reason.

---

## Summary

Raised during definition: 5  (Business: 3, Technical: 2)
**Still open: 3**  (OQ-B-1, OQ-B-3, OQ-T-3) — OQ-B-2 closed 2026-08-07, OQ-T-2 closed 2026-08-09.
Cross-role contradictions: 0

AI-DLC should load this file during Requirements Analysis and resolve each entry
before proceeding to User Stories or Application Design.

**Priority order** if they can't all be addressed at once:
1. **OQ-B-1** (backup/restore) — the only item where the downside is irreversible data loss.
2. **OQ-B-3** (AI-reconstructed prose) — cheap to confirm, and everything downstream inherits it.
3. **OQ-T-3** (next-auth beta) — no action until auth-adjacent work is planned.

~~**OQ-T-2** (CI automation) — makes a declared blocking constraint actually blocking.~~ **Done
2026-08-09.** ~~**OQ-B-2** (cost vs. pool growth) — needs a number, not a decision.~~ **Answered
2026-08-07.**

---

## Explicitly settled — do NOT re-raise

Recorded so these are not mistaken for omissions. Each was an open question during the interview and
was closed by the user:

| Settled item | Resolution |
|---|---|
| Read-aloud / text-to-speech for the age-4 pre-reader | **Declined.** *"pictures alone is sufficient"* |
| Whether the 10 themes stay fixed | **Decided: the pool keeps growing.** |
| Parent visibility into which child pulls what | **Not wanted.** *"no need to know what they are pulling"* |
| Re-tuning `SACRIFICE_MIN` | **Withdrawn.** `burnable = 0` is expected steady state after the children spend duplicates — the feature is tested and working, not unreachable. |
| Current ages of the three children | **Confirmed current at 4, 7, 9** (2026-08-03). |
| Numeric test-coverage target | **Declined by design.** The bar is behavioural: every invariant protecting the children's data must be covered by a property-based or contract test. |
| Infrastructure-as-code | **Not applicable.** No IaC exists or is wanted for one Vercel project + one Neon database. |
