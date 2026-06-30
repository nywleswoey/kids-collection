# U3 Pool & Seeding — Code Generation Plan

**Unit**: U3 Card Pool & Seeding
**Story**: G2 (+ pool source for C1)
**Depends on**: U1 (schema, Blob, types). **Code at workspace root**; doc summary → `aidlc-docs/construction/U3-pool-seeding/code/`.

## Steps

- [ ] **Step 1 — Seed schema + sample data**
  `src/features/pool/seed-schema.ts` (Zod for ThemeSeed/SeedCard). `seed/cards.json` — a small valid sample (e.g. 1 theme × 3 cards) so the pipeline runs out-of-the-box; full set authored via the claude.ai prompt.

- [ ] **Step 2 — claude.ai authoring prompt**
  `seed/AUTHORING_PROMPT.md` — ready-to-paste prompt instructing claude.ai to output full `cards.json` (3 themes × ~12, pyramid rarity 6/3/2/1, short kid-facts, kid-cartoon imagePrompts) matching the schema.

- [ ] **Step 3 — Loader/validator + prompt builder**
  `src/features/pool/loader.ts` (`loadSeed(path)` → validated). `src/features/pool/prompt.ts` (`buildPrompt(card)` + kid-cartoon style suffix; pure).

- [ ] **Step 4 — Image generator (Pollinations) + Blob uploader**
  `src/features/pool/image.ts` — `generateImage(prompt, {fetchImpl, retries})` (bounded retry); `uploadImage(bytes, key)` → Blob URL via `@vercel/blob`.

- [ ] **Step 5 — Pool writer (idempotent)**
  `src/features/pool/writer.ts` — `upsertTheme`, `insertCardIfNew` (skip existing by theme+card name).

- [ ] **Step 6 — Seed orchestrator CLI**
  `scripts/seed/index.ts` — `seedPool` wiring S1–S5, `--review` (write images to `seed/review/`, no publish) vs `--publish`; concurrency cap; prints SeedReport. Add `"seed"` npm script; add `@vercel/blob` + `tsx` deps.

- [ ] **Step 7 — Runtime CardPool reader**
  `src/features/pool/service.ts` — `listThemes`, `listCards(themeId?)`, `getCard(id)` (Drizzle reads) for U4/U5/U6.

- [ ] **Step 8 — Tests**
  `tests/pool.test.ts` — loader validation (reject malformed), `buildPrompt` style suffix, `generateImage` retry/abort with mocked fetch.

- [ ] **Step 9 — Docs**
  `aidlc-docs/construction/U3-pool-seeding/code/summary.md`; README seed instructions.

## Story traceability
- G2 → Steps 1–6 (safe, reviewed, idempotent pool). C1 pool source → Step 7.

## Scope
9 steps, ~10 files. New deps: `@vercel/blob`, `tsx`. Seed run + tests in Build & Test.

---
Approve to generate (**/aidlc:approve**), or request changes.
