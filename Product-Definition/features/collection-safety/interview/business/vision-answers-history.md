# Business Interview (Collection Safety) — Answers History

Append-only durable record of every validated batch (questions + answers, caveats verbatim).
NEVER rewritten or truncated. The active-batch buffer `vision-questions.md` may be overwritten
freely because confirmed answers already live here.

---

## Batch 1: All CORE questions — Q1–Q7
**Validated**: 2026-08-05T10:24:18Z
**Depth**: quick · **Pre-fill**: enabled (repo evidence, read 2026-08-04) · **Interaction**: batch

### Deletion vectors presented with the batch (repo evidence, not user assertion)

| # | Vector | Guard at time of interview | Blast radius |
|---|---|---|---|
| V1 | `pnpm seed --publish --reset` → `resetPool()` deletes every `collections` row, then `cards`, then `themes` (`src/features/pool/writer.ts:81-85`, `scripts/seed/index.ts:71-73`) | None. No confirm, no dry-run, no env check; `pnpm seed` loads `.env.local` = production `DATABASE_URL` | Total — all children, irreversible |
| V2 | `pnpm seed --sync` → `deleteThemesNotIn` / `deleteCardsNotIn`; FK `onDelete: cascade` (`src/db/schema.ts:81-84`) carries into `collections` | None. A typo/rename in `seed/cards.json` destroys that theme's cards for every child | Partial + silent |
| V3 | Admin → Remove profile → `removeProfileAction` → `children` delete → cascade wipes `collections`, `quizCompletions`, `collectionRewards` | Single `window.confirm` (`RemoveProfileButton.tsx:27`) | One child, total |
| V4 | Future migration touching `collections` / `children` / `cards` / `themes` | Policy prose only (parent vision "What Must NOT Change"); nothing mechanical | Varies, up to total |
| V5 | Neon-side loss (branch/project deleted, plan change) | Unknown — parent **OQ-B-1**. No `pg_dump`, no backup script, no restore runbook in repo | Total |

### Q1 [CORE] — What must never be lost, and what recovery guarantee
**Answer**: **c** — Both, prevention first. Block the easy accidents now; add a backup as the safety net.
**Irreplaceable data (verbatim)**: *"Their collections and ticket balances."*
→ In schema terms: `collections` rows **and** the spendable columns on `children` (`pullTokens`,
epic/lucky egg tickets, `{rarity}_pick_tickets`).
**Caveat (AI-raised, unresolved)**: `quizCompletions` and `collectionRewards` were **not** named. They are
the idempotency ledgers for quiz caps and once-per-`(child, theme, rarity)` set rewards. Losing them
independently of `collections` would let already-claimed rewards be re-earned. See **OQ-CS-1**.

### Q2 [CORE] — Verdict per deletion vector
**Answer**: *"ok with recommendation"* — the recommended verdicts are adopted verbatim:
- **V1 → block.** Split `resetPool()` so a pool reset never touches `collections`. Wiping children's rows
  requires a separate, explicitly-named command.
- **V2 → guard.** `--sync` prints what it is about to destroy and refuses to prune child-owned cards
  without an explicit extra flag.
- **V3 → guard.** Keep the operation; replace `window.confirm` with type-the-name confirmation showing the
  card count being destroyed.
- **V4 → guard.** A test or CI check that fails on a destructive migration, since policy alone is
  unenforceable.
- **V5 → recover.** Covered by backup only.

### Q3 [CORE] — Is deleting a child profile ever legitimate
**Answer**: **b** — Soft-delete / archive. "Remove" hides the profile; data stays in the DB, restorable by
the parent.
**Note**: this is the *decided target design*, but Q5 places it **outside the first slice**. Not a
contradiction — the stronger confirmation (V3 guard) is the interim measure until soft-delete ships. See
**OQ-CS-2**.

### Q4 [CORE] — Success criterion
**Answer**: **d** — A + C combined.
- **A**: no collection row is ever lost to an operator action, verified by a restore drill.
- **C**: no path to bulk deletion exists without an explicit, named, confirmed action — structural and
  testable.

### Q5 [CORE] — Scope IN (first slice)
**Answer**: *"ok with recommendation"* — ticked:
- [x] Split `resetPool()` so pool reset never deletes `collections` (V1)
- [x] `--sync` prune guard: dry-run output + explicit flag required to destroy owned cards (V2)
- [x] Stronger profile-delete confirmation: show card count + type-the-name (V3)
- [x] Scheduled `pg_dump` backup to durable storage + documented restore runbook (V5)
- [x] Verify/enable Neon PITR on the current plan; document what it actually covers (V5, OQ-B-1)
- [x] Production-DB guard: destructive scripts refuse to run against a prod `DATABASE_URL` without an
      explicit env flag (V1/V2)

Unticked (deferred, not declined):
- [ ] Soft-delete / archive for child profiles (V3) — target design per Q3, later increment
- [ ] Property-based / contract test asserting no service path deletes an unowned `collections` row (V4)

**Caveat (AI-raised)**: the PBT is unticked, yet Q4's criterion (C) is *"structural, testable by a test
suite"*, and the parent Technical Environment makes Property-Based Testing a **blocking** constraint. See
**OQ-CS-3**.

### Q6 [CORE] — Scope OUT
**Answer (verbatim)**: *"all these are out of scope"* — applied to every candidate offered:
full audit log of every deletion · undo/restore UI inside the app · per-child export (binder as JSON) ·
versioned snapshots of collection state · offsite/second-region backup copies · alerting when a
destructive command runs.
No target phase given for any — recorded as out of scope for this feature rather than declined forever.

### Q7 [CORE] — Cost and effort ceiling
**Answer**: **a** — strictly $0, free tier only. If Neon PITR is not free on the current plan, use
`pg_dump` to free storage.
**Upkeep**: fully automated, zero touch.
**Consequence**: the backup must run unattended on free infrastructure — this constrains the mechanism
more than any technical factor, and is the primary input to the Technical role.

---

## Batch 1 — Amendment 1: Q1 scope widened to a full DB dump
**Validated**: 2026-08-05T10:33:56Z
**Trigger**: user reply — *"make cs 1 a db dump"*, in response to **OQ-CS-1**.

### Q1 [CORE] — amended answer
The irreplaceable-data scope is no longer an enumerated list of tables. **The backup is a full database
dump — every table, no selection.**

Supersedes (does not erase) the original Q1 answer *"Their collections and ticket balances."* That
enumeration stands as the statement of what the user *cares about*; the backup **mechanism** is now
defined more broadly than that list, deliberately, so nothing can be omitted by mistake.

Covered by consequence rather than by enumeration: `collections`, the spendable columns on `children`,
`quizCompletions`, `collectionRewards`, `themes`, `cards`, and any table added later.

**Rationale**: a table allowlist is itself a way to lose data by mistake — a table added in a future
migration would silently fall outside the backup. `pg_dump` with no `-t` filter has no such failure mode,
and at three users the size difference is negligible.

### OQ-CS-1 — RESOLVED
Closed by this amendment. `quizCompletions` and `collectionRewards` no longer need naming: a full dump
captures them, so the idempotency ledgers for quiz caps and once-per-`(child, theme, rarity)` set rewards
stay consistent with `collections` on restore.

**Residual, recorded not raised**: a full dump restores whole-database state. It does **not** provide
selective per-child restore — recovering one child's collection without rolling back the other two is out
of scope, consistent with Q6 (undo/restore UI and per-child export both out of scope). Card **images** live
in Vercel Blob, not Postgres, and are equally outside a `pg_dump`; they are reproducible from
`seed/cards.json`, so this is noted as a known boundary rather than a gap.
