# Technical Interview (Collection Safety) — Batch 1 of 1: all 7 CORE questions

Progress: `░░░░░░░░░░` 0/7 questions  ·  ~8 min

Depth is `quick`, so this is the only Technical batch. Fill in the `[Answer]:` tags, then reply **"ready"**.

> Business role: ✅ complete and approved — saved in `../business/vision-answers-history.md`. Nothing is lost.
> This file shows only the active batch.

Tags: `[from: code]` = read out of the repo just now · `[INFERRED]` = check this hardest.

---

## Constraints carried in from the Business role and the parent Technical Environment

These are **fixed** — the questions below only ask *how*, never *whether*.

- **Strictly $0/month, free tier only** (Q7). The parent deny-list bans any metered or paid service.
- **Fully automated, zero touch** (Q7). A backup you have to remember is one you'll stop doing.
- **Full `pg_dump` — every table, no `-t` allowlist** (Q1, amended). No table selection to keep in sync.
- **No second datastore** — parent deny-list. Worth noting a *backup destination* is not a datastore the
  app reads from, so this doesn't bind here, but the spirit does: nothing new to operate.
- Slice-1 build list is settled: split `resetPool()` · `--sync` prune guard · type-the-name delete confirm ·
  scheduled dump + runbook · verify Neon PITR · prod-DB guard.

## Repo facts I checked just now, so you don't have to

| Fact | Value | Why it matters here |
|---|---|---|
| GitHub repo | `nywleswoey/kids-collection`, **private** `[from: gh repo view]` | Private repos get 2,000 free Actions minutes/month. A nightly dump uses ~1–2 min/run ≈ 45 min/month — comfortably inside free |
| `.github/workflows/` | **Does not exist** `[from: ls]` | Same finding as parent **OQ-T-2**. Whatever runs the backup is likely the same mechanism that would finally enforce your CI gates |
| `vercel.json` / `vercel.ts` | Neither exists `[from: ls]` | No cron declared today; Vercel Hobby cron is limited to **once per day** and is best-effort on timing |
| `pg_dump` availability | Not on Vercel Functions; **is** on GitHub Actions runners `[INFERRED — standard runner image]` | This mostly settles T1 on its own |
| Blob token | `BLOB_READ_WRITE_TOKEN` already in env `[from: .env.example]` | Vercel Blob is a candidate destination with zero new accounts |
| DB driver | `@neondatabase/serverless` over HTTP | App-side only. `pg_dump` needs the standard Postgres wire protocol, i.e. Neon's pooled/direct connection string, not the HTTP driver |

---

## Question T1 [CORE]: Where does the backup job run?

a) **GitHub Actions scheduled workflow** — `pg_dump` on the runner, free minutes on a private repo, no new
   account, and it's the same mechanism that would close OQ-T-2. (Recommended)
b) **Vercel Cron** hitting a Function — but Functions have no `pg_dump` binary; you'd hand-roll a dump by
   querying every table, which reintroduces exactly the "keep a table list in sync" failure mode Q1 rejected.
c) **A machine I own** (Mac cron / launchd) — free, but not zero-touch: it only runs when the laptop is awake.
d) **Neon PITR only** — no job at all; rely entirely on the platform.
e) Other

**Recommendation:** (a). It's the only option that is simultaneously free, genuinely unattended, and able to
run a real `pg_dump`. (b) fails the Q1 full-dump requirement, (c) fails "fully automated", (d) is worth
having but shouldn't be the *only* layer — see T4.

[Answer]: a

---

## Question T2 [CORE]: Where do the dumps land, and how long are they kept?

Candidates, all $0:

a) **GitHub Actions artifacts** — zero setup, but retention caps at 90 days and they're awkward to reach in a
   hurry.
b) **A separate private GitHub repo** (`kids-collection-backups`) committed to on each run — durable, versioned,
   trivially browsable, but git history grows forever and a `pg_dump` is a poor fit for diffing.
c) **Vercel Blob** (`BLOB_READ_WRITE_TOKEN` already exists) — no new account, but it puts the backup in the
   same vendor as the thing being backed up.
d) **Two of the above** — one primary, one that isn't Vercel.
e) Other

Also state **retention**: how many dumps, how far back? (e.g. last 7 daily + last 4 weekly)

**Recommendation:** (a) with 90-day retention, as the whole slice. Note the tension: Q6 put *offsite/second-region
backup copies* explicitly out of scope, so a single destination is consistent with the approved scope — but
GitHub artifacts alone means the backup shares a failure domain with nothing you control. Worth being deliberate.

**Compression note**: gzip a `pg_dump` of ~300 cards + 3 children — expect well under 1 MB. Storage is a non-issue
at any of these options; pick on retrievability, not size.

[Answer]: a

---

## Question T3 [CORE]: Schedule, and the acceptable loss window

Q1 chose "prevention first, backup as the safety net" but never fixed an RPO. If the DB is lost at 6pm, how much
of that day's pulling is acceptable to lose?

a) **Daily** — up to 24h of pulls lost. Simple, cheap, matches the app's rhythm.
b) **Twice daily** — up to 12h.
c) **Hourly** — near-zero loss, but 720 runs/month of Actions minutes and 720 artifacts to manage.
d) Other

**Recommendation:** (a) daily, scheduled overnight. A lost afternoon of pulls is a disappointed child, not a lost
collection — and the kids can re-pull. The catastrophic case this protects against (V1/V5, total wipe) is equally
covered at any of these frequencies.

**Also worth deciding**: should the workflow be manually triggerable (`workflow_dispatch`) so you can take a dump
on demand *right before* running anything destructive? Recommended yes — that turns the backup into an actual
pre-flight step for `seed --reset`.

[Answer]: a

---

## Question T4 [CORE]: Neon PITR — verify, or skip?

Slice 1 includes *"verify/enable Neon PITR on the current plan; document what it actually covers"*. This is the
only item in the slice I cannot answer from the repo — it needs the Neon dashboard.

a) **I'll check the Neon dashboard and report back** — plan name + history-retention window.
b) **You tell me what to look for and I'll paste the screen** — I'll interpret it.
c) **Skip it** — the `pg_dump` is enough; treat PITR as unknown.
d) Other

**Recommendation:** (a) or (b). Neon's free tier has historically included a short PITR window (measured in
hours to a day) — if that holds on your plan, it covers the *fast* recovery case (an accidental `--reset` noticed
within minutes) far better than a nightly dump does, and the dump covers the *slow* case (project deleted, or a
mistake noticed a week later). They're complements, and knowing the window turns OQ-B-1 from open to closed.

`[INFERRED]` — the exact free-tier retention figure is not something I can verify from here, and Neon has changed
its tiers before. Treat any number I state as needing confirmation.

[Answer]: a (6 hrs)

---

## Question T5 [CORE]: What counts as a verified restore?

Business Q4(A) requires the safety net be proven by a **restore drill**, not merely to exist. What's the bar?

a) **Manual, once** — restore into a local Docker Postgres by hand, document the steps, done.
b) **Manual, on a schedule** — a runbook plus a reminder to re-run the drill periodically.
c) **Automated** — the workflow itself restores the dump into a throwaway Postgres and asserts row counts, so a
   silently-corrupt backup fails loudly. (Recommended)
d) Other

**Recommendation:** (c). You already have the machinery: `pnpm pg:up` stands up Postgres 16 in Docker and applies
every migration `[from: package.json:15]`, and `test:pg` already runs against it. Restoring the dump into that same
container and asserting `collections` row count > 0 is a handful of extra lines in the workflow — and it's the
difference between having a backup and knowing you have one.

[Answer]: c

---

## Question T6 [CORE]: What shape should the destructive-command guard take?

Slice 1 wants destructive scripts to refuse to run against production without an explicit flag (V1/V2). Mechanism:

a) **Env flag** — refuse unless `ALLOW_DESTRUCTIVE=1` is set. Simple, but a flag you've set once in `.env.local`
   stops protecting you.
b) **Interactive confirmation** — the script prints what it will destroy (row counts) and requires typing a
   phrase. Can't be left permanently enabled.
c) **Host detection** — the script inspects `DATABASE_URL`, and if it looks like the Neon production host, refuses
   outright unless an explicit `--i-know-this-is-production` argument is passed on the command line.
d) **b + c** — detect production, print the blast radius, require both the CLI flag and a typed confirmation.
e) Other

**Recommendation:** (d). (a) is the weakest — the entire V1 scenario is "`.env.local` was loaded and I didn't think
about it", and an env flag lives in that same file. A CLI argument has to be typed fresh each time, which is the
property you actually want. Note the guard must cover **both** `--reset` and `--sync` prunes, since V2 destroys
data with no destructive-sounding flag at all.

[Answer]: d

---

## Question T7 [CORE]: How is the `resetPool()` split held in place?

V1's verdict was **block**: pool reset must never touch `collections`. Once split, what stops it being
re-merged later by well-meaning code?

a) **Convention** — a comment explaining why, and the parent doc's "What Must NOT Change" entry.
b) **A unit test** asserting `resetPool()` leaves `collections` untouched.
c) **A contract/property test in `tests/contracts/`** so it runs against both the fake and the real pg adapter.
d) **Test + a new entry in the parent "What Must NOT Change"** so future AI-DLC work inherits it as a hard
   boundary. (Recommended)
e) Other

**Recommendation:** (d), with the test at level (b) or (c). Relevant history: Business Q5 left the broader
"no service path deletes an unowned `collections` row" PBT **out** of slice 1 (**OQ-CS-3**), and your parent
Technical Environment makes PBT **blocking**. A narrow test on this one function is much smaller than that PBT and
closes the specific hole you're fixing — leaving OQ-CS-3 open for the general case rather than shipping slice 1
with no mechanism at all behind V4.

[Answer]: d

---

When all seven are filled in, reply **`ready`**.
