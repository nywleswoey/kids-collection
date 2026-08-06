# Business Interview (Collection Safety) — Batch 1 of 1: all 7 CORE questions

Progress: `░░░░░░░░░░` 0/7 questions  ·  ~8 min

Depth is `quick`, so this is the only Business batch. Fill in the `[Answer]:` tags below, then reply **"ready"**.

> Nothing prior to lose — this is the first batch of a new scoped discovery.
> Answers are saved to `vision-answers-history.md` on validation.

Tags: `[from: code]` = read out of the repo just now · `[INFERRED]` = check this hardest.

---

## Findings first — the deletion vectors that actually exist today

I searched the repo before writing these questions. Five ways your kids' collection rows can disappear:

| # | Vector | Guard today | Blast radius |
|---|---|---|---|
| **V1** | `pnpm seed --publish --reset` → `resetPool()` deletes **every row** in `collections`, then `cards`, then `themes` `[from: src/features/pool/writer.ts:81-85, scripts/seed/index.ts:71-73]` | **None.** One CLI flag. No confirm, no dry-run, no env check — it hits whatever `DATABASE_URL` is loaded, and `pnpm seed` loads `.env.local`, which is your **production** Neon URL | **Total.** All three children, every card, irreversible |
| **V2** | `pnpm seed --sync` → `deleteThemesNotIn` / `deleteCardsNotIn` prune anything missing from `seed/cards.json`; FK `onDelete: cascade` carries the delete into `collections` `[from: writer.ts, schema.ts:81-84]` | **None.** Editing/renaming a theme in a JSON file silently destroys every child's cards in that theme | **Partial + silent.** A typo in `cards.json` is enough |
| **V3** | Admin → Manage profiles → Remove → `removeProfileAction` → `children` row deleted → cascade wipes that child's `collections`, `quizCompletions`, `collectionRewards` `[from: profile-store.pg.ts, schema.ts:81]` | A single `window.confirm("Remove {name}? This permanently deletes their card collection.")` `[from: RemoveProfileButton.tsx:27]` | **One child, total.** Behind parent auth + admin gate, but one misclick past the confirm |
| **V4** | A future migration touching `collections` / `children` / `cards` / `themes` | Policy only — the "What Must NOT Change" rule in the parent vision doc. Nothing mechanical enforces it | **Varies, up to total** |
| **V5** | Neon-side loss (branch deleted, project deleted, plan change) | **Unknown — this is OQ-B-1.** No `pg_dump`, no backup script, no restore runbook anywhere in the repo | **Total** |

Note V1's real danger isn't the flag — it's that `resetPool()` deletes `collections` at all. Wiping the
*pool* (cards/themes) is a legitimate operation; wiping the *children's rows* is collateral damage that
was correct for the one-time Superheroes→Dinosaurs swap (U4-FR4) and has been loaded and cocked ever since.

---

## Question 1 [CORE]: What must never be lost, and what recovery guarantee do you want?

"Not deleted by mistake" can mean prevention, recovery, or both. Pick the guarantee you actually want.

a) **Recovery-first** — deletion stays possible, but I can always restore. Target: lose at most ~24h of pulls.
b) **Prevention-first** — make accidental deletion structurally impossible/hard; accept no backup for now.
c) **Both, prevention first** — block the easy accidents now, add a backup as the safety net (Recommended).
d) **Both, recovery first** — get a backup in place first, then harden the paths.
e) Other

**Recommendation:** (c). V1 and V2 are one command away and cost near-zero to fix; a backup is the only
thing that covers V4/V5 but takes more setup. Fixing the cheap structural holes first shrinks the window.

Also state: **which data** counts as irreplaceable — just `collections`, or also ticket balances on
`children` (pull tokens, egg/pick tickets), `quizCompletions`, `collectionRewards`?

[Answer]: c. Their collections and ticket balances.

---

## Question 2 [CORE]: Verdict on each vector — guardrail, or make impossible?

For each of V1–V5 above, say which you want. Suggested shorthand: `block` (make it impossible),
`guard` (keep it, add friction/confirmation), `accept` (leave as-is), `recover` (covered by backup only).

**Recommendation:**
- **V1 → block.** Split `resetPool()` so pool-reset never touches `collections`. Wiping children's rows should require a separate, explicitly-named command.
- **V2 → guard.** `--sync` should refuse to prune anything owned by a child unless given an explicit extra flag, and should print what it's about to destroy first.
- **V3 → guard.** Legitimate operation, but `window.confirm` is weak. Type-the-name confirmation, and show the card count being destroyed.
- **V4 → guard.** Policy is unenforceable; a test or CI check that fails on a destructive migration makes it real.
- **V5 → recover.** Only a backup covers this.

[Answer]: ok with recommendation

---

## Question 3 [CORE]: Is deleting a child profile ever legitimate?

This decides whether V3 is a guardrail problem or a design problem.

a) **Yes, keep hard delete** — just make it harder to hit by accident.
b) **Soft-delete / archive** — "Remove" hides the profile; data stays in the DB, restorable by the parent.
c) **Never delete** — remove the button entirely; profiles are permanent.
d) Other

**Recommendation:** (b). With three children and no plan to add more, hard delete has almost no upside,
and soft-delete turns the worst single-click accident in the app into an undo. It also costs one nullable
`archived_at` column rather than a new subsystem.

[Answer]: b

---

## Question 4 [CORE]: How do you know this feature worked?

The parent vision has exactly one success metric ($0/month runtime cost). What's the criterion here?

a) **Zero-loss assertion** — no collection row is ever lost to an operator action; verified by a restore drill.
b) **Restore drill passes** — I can demonstrably restore yesterday's data into a scratch DB on demand.
c) **No path to bulk deletion without an explicit, named, confirmed action** — structural, testable by a test suite.
d) A + C combined (Recommended)
e) Other

**Recommendation:** (d). (c) is mechanically testable today; (a)/(b) prove the safety net actually works
rather than merely existing — an untested backup is a belief, not a backup.

[Answer]: d

---

## Question 5 [CORE]: What's IN the first slice?

Tick what ships in the first increment. Scope-creep firewall — everything unticked goes to Q6.

- [x] Split `resetPool()` so pool reset never deletes `collections` (V1)
- [x] `--sync` prune guard: dry-run output + refuse to destroy owned cards without an explicit flag (V2)
- [x] Stronger profile-delete confirmation: show card count + type-the-name (V3)
- [ ] Soft-delete/archive for child profiles instead of hard delete (V3)
- [x] Scheduled `pg_dump` backup to somewhere durable + documented restore runbook (V5)
- [x] Verify/enable Neon point-in-time restore on the current plan; document what it actually covers (V5, OQ-B-1)
- [ ] Property-based / contract test asserting no service path can delete a `collections` row it doesn't own (V4)
- [x] Production-DB guard: destructive scripts refuse to run against a prod `DATABASE_URL` without an explicit env flag (V1/V2)

**Recommendation:** all except soft-delete and the PBT — those two are the largest, and the rest are
hours of work that close the two vectors requiring no mistake more serious than a typo.

[Answer]:ok with recommendation

---

## Question 6 [CORE]: What's explicitly OUT, and why?

Every row here is a scope-creep firewall. Give a target phase if it's deferred rather than declined.

Candidates worth an explicit verdict: full audit log of every deletion · undo/restore UI inside the app ·
per-child export ("download my binder as JSON") · versioned snapshots of collection state · offsite/second-region
backup copies · alerting when a destructive command runs.

[Answer]: all these are out of scope

---

## Question 7 [CORE]: Cost and effort ceiling

The standing product metric is **$0/month runtime cost**, and you're a one-person team. That constrains
the backup design more than anything technical.

a) **Strictly $0** — free tier only; if Neon PITR isn't free on my plan, use a `pg_dump` to free storage.
b) **$0 preferred, but I'd pay a few $/month** for a managed backup that I never have to think about.
c) **Whatever it costs** — the data is irreplaceable and the amount is trivial.
d) Other

Also: how much **ongoing upkeep** is acceptable? (a) fully automated, zero touch · (b) a manual step I run
occasionally · (c) don't care as long as it works.

**Recommendation:** (a) + fully automated. A backup that needs remembering is one you'll stop doing —
and the whole point is protecting against the times you weren't paying attention.

[Answer]: yes, a + fully automated

---

When all seven are filled in, reply **`ready`**.
