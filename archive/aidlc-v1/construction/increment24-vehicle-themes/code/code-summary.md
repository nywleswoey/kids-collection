# INCREMENT 24 — Code Generation Summary: Vehicle Themes (Slice A)

**Status**: **Slice A DONE** — awaiting approval at the Code Generation gate.
**Slice B (FR13–FR21, authoring + publish) NOT started** — see §6.
**Date**: 2026-08-07
**Design**: `aidlc-docs/inception/application-design/increment24-vehicle-themes-design.md`
(D1–D7 all = A)
**Gate results**: `pnpm typecheck` clean · **275/275** unit tests (was 229, **+46**) ·
`pnpm build` ✅ · zero new npm dependencies · no migration · no schema change ·
no application code · `seed/cards.json` untouched so far

---

## 1. What shipped

### New — `src/features/pool/`

| File | Purity | Purpose |
|---|---|---|
| `keys.ts` | pure | `slug` / `blobKey` / `promptHash` / `reviewKey` (FR7) |
| `publish-plan.ts` | **pure** | `cardKey` + `planInserts` — the one set FR9 and FR10 share |
| `completeness.ts` | **pure** | `comparePoolShape` (FR12) |
| `pool-reads.ts` | db | `listPublishedCardKeys` + `readPublishedShape` |
| `url-check.ts` | network | `checkSourceUrls` (FR11) |

### New — tests

`tests/seed-rules.pbt.test.ts` (**PBT**, FR6 — closes OQ-VT-J1) · `tests/keys.test.ts` ·
`tests/publish-plan.test.ts` · `tests/completeness.test.ts` · `tests/url-check.test.ts`

### Modified

| File | Change |
|---|---|
| `seed/AUTHORING_PROMPT.md` | **FR1, done first.** Weapons permitted / gore + violence prohibited / ≤2–3 military per theme; twelve theme names; the schema-enforced rules marked as such; the new `--check-urls` → `--review` → `--sync` runbook and its stop conditions |
| `src/features/pool/seed-schema.ts` | FR2–FR5 as zod refinements + exported `CARDS_PER_THEME` / `RARITY_PYRAMID` |
| `scripts/seed/index.ts` | `--check-urls`, plan-driven loop, FR8 reviewed-bytes publish, FR9 guard, FR10 scoped review, FR12 completeness; `slug` removed (moved to `keys.ts`) |
| `tests/pool.test.ts` | Forced rewrite — see §3 |

### Deleted

Nothing. No file, no export, no port method, no route.

---

## 2. ⚠️ Deviation from the design: `pool-reads.ts` was not in the plan

§2.1 of the design put `listPublishedCardKeys` inside `publish-plan.ts` and
`readPublishedShape` inside `completeness.ts`. **Built, that fails immediately**: importing the `db`
singleton evaluates `env.databaseUrl` at module load, so both test files died with
*"Missing required environment variable: DATABASE_URL"* before a single assertion ran.

That is not a test-harness annoyance — it is the repo's own standing rule catching the design:

> *"keep pure logic separate from persistence so it stays testable without a database; pure logic
> modules take no `db` import"* — parent `technical-environment.md`, Project Structure

So the two queries moved into one db-touching `pool-reads.ts`, leaving `publish-plan.ts` and
`completeness.ts` genuinely pure. This is the same split Inc 23 used for `backup/count-report.ts`
(pure) versus `scripts/backup/verify.ts` (I/O). Five modules instead of four; no behaviour changed.

---

## 3. ⚠️ `tests/pool.test.ts` was rewritten, and it is not churn

Every fixture in that suite was a **one-card theme**, which FR2 now rejects. Two things followed, both
predicted at design time (§3.2):

1. `"accepts a valid seed"` started failing.
2. The negative tests would have kept passing **for the wrong reason** — `parseSeed` throws on the card
   count before reaching the rarity enum, so `"rejects invalid rarity"` would have been green while
   asserting nothing.

Each case is now *a valid 30-card file with exactly one thing wrong*, built from a `validTheme()`
helper. Four spot-checks for the new rules were added alongside; the property-based coverage lives in
`seed-rules.pbt.test.ts`.

---

## 4. ⚠️ Finding at Construction: the URL checker's first build cried wolf

Built as designed — 8-wide, Node's default user-agent, no retry — `pnpm seed --check-urls` came back
against the real 300-card file with **~100 failures, every one a `429`**. Wikipedia throttles bursts
from generic agents hard.

**This is worse than having no check.** The operator's response to a reported failure is to go and edit
the URL, so a checker that reports rate limiting as rot actively damages good data — and it would have
done so during exactly the authoring session FR11 exists to support.

Fixed in `url-check.ts`, all three parts load-bearing:

1. A descriptive `USER_AGENT`.
2. Default concurrency 8 → **4**.
3. Retry on 429 / 408 / 5xx with backoff honouring `Retry-After` — the same shape `image.ts` already
   uses against Pollinations. A **404 is never retried**: real rot is final, and burning four retries on
   it just makes the check slow.

Only a status that survives every retry is reported. Re-run against the real file:

```
Checking 300 sourceUrl(s)…
✓ all 300 sourceUrl(s) returned 200.
```

Three of the nine unit tests exist specifically to pin this: a 429 that later succeeds is **not**
reported, a 429 that never recovers **is**, and a 404 is reported on the first attempt.

---

## 5. Verified by hand against a real database

`pnpm pg:up` (Postgres 16 + local Neon HTTP proxy), pool seeded with one published theme, driving the
**real CLI** in a child process. No Blob token, no Pollinations key, no production credential.

**Module level — 8/8:**

- `listPublishedCardKeys` is read-only (row counts identical before/after) and returns exactly the 30
  published pairs
- `planInserts` covers all 270 unpublished cards and excludes every published one
- a theme with **no row** plans all 30 of its cards — the case that keeps `--review` write-free
- `comparePoolShape` reports nothing for a whole theme, 36 shortfalls for nine missing ones, and
  catches a single deleted legendary

**CLI level — 11/11:**

| Check | Result |
|---|---|
| FR9 `--sync`, nothing reviewed | exit **1**, message printed |
| FR9 wrote nothing | `{themes:1, cards:30}` unchanged — **not even the 9 new theme rows**, proving `upsertTheme` never ran |
| FR9 named every planned insert | **270** listed |
| FR10 `--review`, everything reviewed | **0 images generated**, `skipped: 300` |
| FR10 `--review` wrote nothing | row counts unchanged |
| FR10 resumability — one review file deleted | **exactly 1** image regenerated (Griffin) |
| FR10 still wrote nothing | row counts unchanged |
| FR9 guard passes once all planned cards are reviewed | no refusal |
| FR8 `--sync` reused reviewed bytes | **Pollinations never called** — zero `generating image` lines |
| FR12 completeness caught the resulting shortfall | `36 (theme, rarity) short`, exit 1 |

The FR10 number is the headline: on today's pool `--review` generated **0** images where the
pre-Inc24 code would have generated **300**, and it made **zero** writes.

**Probe residue removed** — `_probe*.mts` deleted, `seed/review/` back to its original 33 files,
`pnpm pg:down` run.

---

## 6. Not done — Slice B (FR13–FR21)

`seed/cards.json` is **untouched**; the pool is still 10 themes / 300 cards. Remaining:

| FR | Item | Blocker |
|---|---|---|
| FR13/FR14 | Author 60 cards | Ready to start — FR1 is committed, so an authoring session now receives the amended rule |
| FR16 | `--check-urls` on the new 60 | Follows authoring |
| FR17 | **Eyeball all 60 images** | **Human only.** The parent is the gate; nothing here can substitute |
| FR18 | `--sync` theme by theme | Needs FR17 |
| FR21 | Blob/Neon before-and-after | **The "before" figure must be read before the first `--sync`** |

---

## 7. Gate

**Slice A: APPROVED?** Two items decided at Construction rather than at design time:

> **§2** — `pool-reads.ts` exists as a fifth module so the planner and comparator stay db-free.
>
> **§4** — `--check-urls` gained a user-agent, lower concurrency and transient-status retry after its
> first build reported ~100 false failures against the real seed file.

**Carried forward unchanged**: parent OQ-T-2 (no test CI — everything above except the schema runs only
when invoked locally), OQ-CS-3, and the military/research assumption in FR14.
