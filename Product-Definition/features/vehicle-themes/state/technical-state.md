# Technical State
- Status: complete — approved by user 2026-08-07T10:16:22Z (artefact-verification gate passed)
- Artifact: `technical-environment.md` rendered 2026-08-07T10:16:22Z
- Depth: quick
- Scope: Two new categories — Flying Machines, Ocean Machines

## Questions
- [x] T1 [CORE] — Review→publish image gap — **a**: `--sync` reuses `seed/review/<key>.jpg` when
      present; published bytes are byte-identical to reviewed bytes
- [x] T2 [CORE] — Schema validation — **c**: 30-card count + 15/8/5/2 pyramid + pool-wide name
      uniqueness in `seed-schema.ts`, **plus `eduText` `.max(120)`** (added by Amendment 1).
      PBT (option d) not adopted
- [x] T3 [CORE] — `sourceUrl` 200-check — **b**: committed `pnpm seed --check-urls` flag; `loadSeed`
      stays network-free
- [x] T4 [CORE] — Authoring location — **b + c**: in-repo against `seed/cards.json`, merge gated by
      the T2 schema and the T3 URL check
- [x] T5 [CORE] — Military cap — **c**: human review, cap written into `seed/AUTHORING_PROMPT.md`.
      No seed metadata flag
- [x] T6 [CORE] — OQ-B-2 runway number — **a**: manual dashboard reading, recorded in the increment doc
- [x] T7 [CORE] — Publish mechanics — **a(ii)** theme by theme · completeness check after sync ·
      stop condition confirmed

## Repo findings carried into the questions
- **F1** — Pollinations URL has no `seed` param and `--sync` regenerates rather than reusing
  `seed/review/`, so the reviewed image is not the published image. Contradicted the vision document's
  *"no unreviewed content path to a child, ever"* invariant.
  `[src/features/pool/image.ts:40, scripts/seed/index.ts:162-181]` → **closed by T1(a)**
- **F2** — `seed-schema.ts` enforced no card count, no rarity pyramid, no name uniqueness, no URL
  reachability, no `eduText` length → **fully closed** by T2(c) + T3(b) + Amendment 1's `.max(120)`
- **F3** — Inc23 prune guard is correctly shaped: pure addition triggers no prune and no TTY confirm
  → **confirmed as the stop condition in T7(c)**
- **F4** — Still no test/lint CI (`.github/workflows/backup.yml` only). Parent OQ-T-2 remains open
- **F5** — No usage-measurement tooling; not built (T6a)

## Pre-declared open questions
- ~~OQ-VT-T1 — `seed/review/` untracked and staleness-prone~~ **RESOLVED 2026-08-07** — (1)
  content-addressed review filenames `slug(theme-card)-<sha256(prompt)[0:8]>`, making staleness
  impossible by construction; (2) `--sync` refuses to publish any *newly inserted* card lacking a
  matching review file without `--allow-unreviewed`, mirroring the `--allow-prune` idiom. The
  machine-local exposure is accepted and documented. Number not reused.
- ~~OQ-VT-T2 — `eduText` length unenforced~~ **RESOLVED 2026-08-07** — `.max(120)` added to
  `seed-schema.ts`. Verified safe: longest existing value is 110 chars. Number not reused.
- ~~OQ-VT-T3 — remedy for a post-sync shortfall undefined~~ **RESOLVED 2026-08-07** — the check runs
  at the end of `--sync` with a non-zero exit; the remedy is to re-run `--sync` (idempotent, inserts
  only what is missing); never prune, never reset. A short theme is not data loss. Number not reused.

## Measurements taken during discovery (2026-08-07, against `seed/cards.json`)
- Longest `eduText` across all 300 cards: **110 chars**. Zero exceed 120.
- Card names: **300 total, 300 unique** across all ten themes.
Both new schema rules pass on today's file — they are forward guards, not retro-fixes.
