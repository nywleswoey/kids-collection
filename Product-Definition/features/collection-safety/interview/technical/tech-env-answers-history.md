# Technical Interview (Collection Safety) — Answers History

Append-only durable record of every validated batch (questions + answers, caveats verbatim).
NEVER rewritten or truncated. The active-batch buffer `tech-env-questions.md` may be overwritten
freely because confirmed answers already live here.

---

## Batch 1: All CORE questions — T1–T7
**Validated**: 2026-08-05T11:24:04Z
**Depth**: quick · **Pre-fill**: enabled (repo evidence, read 2026-08-05) · **Interaction**: batch

### Repo facts presented with the batch (evidence, not user assertion)

| Fact | Value |
|---|---|
| GitHub repo | `nywleswoey/kids-collection`, **private** `[from: gh repo view]` — 2,000 free Actions minutes/month |
| `.github/workflows/` | Does not exist `[from: ls]` — same finding as parent OQ-T-2 |
| `vercel.json` / `vercel.ts` | Neither exists `[from: ls]` — no cron declared today |
| `pg_dump` on Vercel Functions | Not available; present on GitHub Actions runners `[INFERRED — standard runner image]` |
| `BLOB_READ_WRITE_TOKEN` | Already in env `[from: .env.example]` |
| DB driver | `@neondatabase/serverless` (HTTP) — app-side only; `pg_dump` needs the standard wire protocol |

### T1 [CORE] — Where the backup job runs
**Answer**: **a** — GitHub Actions scheduled workflow. `pg_dump` runs on the runner; free minutes on a
private repo; no new account.
**Consequence**: `.github/workflows/` gets created for the first time by this feature. That is also the
mechanism parent **OQ-T-2** has been waiting on (CI gates declared but unenforced) — noted, not scoped in.

### T2 [CORE] — Where dumps land, and retention
**Answer**: **a** — GitHub Actions artifacts, default 90-day retention.
**Recorded consequence**: a single destination, consistent with Business Q6 (offsite/second-region copies
explicitly out of scope). It does mean backups and source share one vendor and one account. See
**OQ-CS-4** — this is the same shape as the parent vision's existing "single Google account is a single
point of failure" risk, and is recorded rather than solved.
**Size**: gzipped dump of 300 cards + 3 children expected well under 1 MB — storage is not a factor.

### T3 [CORE] — Schedule and acceptable loss window
**Answer**: **a** — Daily, scheduled overnight. **RPO: up to 24h of pulls.**
**Caveat (sub-question not answered)**: the batch also asked whether the workflow should be manually
triggerable via `workflow_dispatch` so a dump can be taken immediately before running anything
destructive. The user answered only "a". **Assumption adopted: yes, include `workflow_dispatch`** — it is
free, additive, and makes the backup usable as a pre-flight step for `seed --reset`. Flagged so it can be
reversed cheaply if wrong.

### T4 [CORE] — Neon PITR
**Answer**: **a**, checked — **PITR retention window is 6 hours** on the current plan.
**This closes the unknown at the heart of parent OQ-B-1.** The two layers now compose:

| Time since the mistake | Covered by | Loss |
|---|---|---|
| 0–6 h | Neon PITR — restore to the exact second before | ~none |
| 6–24 h | Last nightly dump | up to 24 h of pulls |
| > 24 h, up to 90 days | Older nightly dumps in Actions artifacts | up to 24 h of pulls, from that day |
| > 90 days | **Nothing** | total |

**Named gap**: the 6–24 h band has no point-in-time capability — recovery there means restoring last
night's dump and accepting the day's pulls are gone. Consistent with the RPO chosen in T3, recorded so it
is a known property rather than a discovery made during an incident.

### T5 [CORE] — What counts as a verified restore
**Answer**: **c** — Automated. The workflow restores its own dump into a throwaway Postgres and asserts
row counts, so a silently-corrupt backup fails loudly.
**Existing machinery to reuse**: `pnpm pg:up` stands up Postgres 16 in Docker and applies every migration
in order `[from: package.json:15]`; `test:pg` already runs against it via a local Neon HTTP proxy.
**Satisfies** Business Q4(A) — "verified by a restore drill" — mechanically rather than by discipline.

### T6 [CORE] — Shape of the destructive-command guard
**Answer**: **d** — host detection **plus** typed confirmation. The script inspects `DATABASE_URL`; if it
resolves to the production Neon host it refuses outright unless an explicit CLI argument is passed, prints
the blast radius (row counts about to be destroyed), and requires a typed phrase.
**Rejected and why**: (a) env flag — the entire V1 scenario is "`.env.local` was loaded and I didn't think
about it", and an env flag lives in that same file. A CLI argument must be typed fresh each run.
**Scope note**: the guard must cover **both** `seed --reset` and `--sync` prunes. V2 destroys data with no
destructive-sounding flag at all, which is what makes it the more dangerous of the two.

### T7 [CORE] — Holding the `resetPool()` split in place
**Answer**: **d** — a test **plus** a new entry in the parent document's "What Must NOT Change", so future
AI-DLC work inherits it as a hard boundary rather than as a comment.
**Interaction with OQ-CS-3**: Business Q5 left the broad "no service path deletes an unowned `collections`
row" property-based test out of slice 1, while the parent Technical Environment makes PBT **blocking**.
T7 closes the specific hole (pool reset must not touch `collections`) with a narrow test; the general case
stays open as **OQ-CS-3**.

---

## Implementation notes surfaced during the interview
Not decisions — facts the build stage will hit immediately.

- **`pg_dump` needs a standard `postgres://` connection string**, not the Neon HTTP driver the app uses.
  Neon's `DATABASE_URL` is a standard connection string, so this should be a non-issue, but it is the first
  thing to verify when the workflow is written.
- **`pg_dump` major version must be ≥ the server's** (Postgres 16). GitHub runners ship a recent
  `postgresql-client`; pin it explicitly rather than relying on the runner default drifting.
- **`DATABASE_URL` must be added as a GitHub Actions secret.** It is currently only in Vercel env and
  `.env.local`. This is a new place a production credential lives — worth being deliberate about, given the
  parent document's standing rule that no secret reaches the client bundle (unrelated surface, same care).
