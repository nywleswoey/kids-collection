# U3 Pool & Seeding — Code Summary

## Files created
### Seed pipeline (offline)
- `src/features/pool/seed-schema.ts` — Zod schema (ThemeSeed/SeedCard)
- `src/features/pool/loader.ts` — `loadSeed`/`parseSeed` (fail-fast validation)
- `src/features/pool/prompt.ts` — `buildPrompt` + kid-cartoon `ART_STYLE` (pure)
- `src/features/pool/image.ts` — `generateImage` (Pollinations, bounded retry, injectable fetch) + `uploadImage` (Blob)
- `src/features/pool/writer.ts` — `upsertTheme`, `cardExists`, `insertCardIfNew` (idempotent, no-publish-without-image)
- `scripts/seed/index.ts` — CLI orchestrator: `--review` (images → `seed/review/`) / `--publish` (Blob + DB), concurrency cap, report

### Seed data
- `seed/cards.json` — valid sample (Animals × 4 across all rarities)
- `seed/AUTHORING_PROMPT.md` — paste-into-claude.ai prompt → full 3×12 `cards.json`

### Runtime
- `src/features/pool/service.ts` — `listThemes`/`listCards`/`getCard` (consumed by U4/U5/U6)

### Tests
- `tests/pool.test.ts` — seed validation, prompt style, generateImage retry/abort (mocked fetch)

### Config
- `package.json`: `@vercel/blob` + `tsx` deps; `"seed"` script
- `.gitignore`: ignore `seed/review/`

## Story closure
- **G2** pool seeded & safe ✅ (review gate, no-publish-without-image, idempotent). Pool source for **C1** ready via `service.ts`.

## How to seed
```bash
# 1) author full data: paste seed/AUTHORING_PROMPT.md into claude.ai, save → seed/cards.json
npm run seed -- --review     # generate images to seed/review/, eyeball them
npm run seed -- --publish    # upload + insert (safe to re-run)
```
Install + tests + seed run happen in Build & Test.
