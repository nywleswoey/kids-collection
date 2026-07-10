# U1 Foundation & Data — Code Summary

Greenfield generation. All application code at workspace root (not in aidlc-docs/).

## Files created
### Scaffold / config
- `package.json` — deps + scripts (dev/build/test/db:*)
- `tsconfig.json` — strict TS, `@/*` → `src/*`
- `next.config.ts` — Blob + Pollinations image hosts
- `postcss.config.mjs`, `app/globals.css` — Tailwind v4 + reduced-motion baseline
- `vitest.config.ts` — test runner + `@` alias
- `.gitignore`, `.env.example`
- `app/layout.tsx`, `app/page.tsx` — root layout + placeholder home (`data-testid="home-page"`)

### Data layer
- `src/db/schema.ts` — Drizzle: `themes`, `cards`, `children`, `collections`; rarity enum; constraints (unique childId+cardId, FKs w/ cascade, `pull_tokens >= 0` default 3, `count >= 1`); indexes
- `src/db/index.ts` — server-only Neon + Drizzle client
- `drizzle.config.ts` — drizzle-kit config
- `src/db/migrations/0000_init.sql` — initial schema migration

### Logic + types
- `src/lib/types.ts` — Rarity, Card, Theme, Child, CollectionEntry, weights (60/25/12/3)
- `src/lib/avatars.ts` — preset avatar set + validation
- `src/lib/logic.ts` — pure: `drawCard`, `applyPull`, `grantTokens`, `themeProgress`
- `src/lib/env.ts` — server-only env validation (fail fast)

### Tests
- `tests/logic.pbt.test.ts` — property-based (fast-check): BR1 draw distribution, BR5/BR6 token rules, BR8/BR9 duplicates, BR11 progress bounds

## Notes
- `pnpm install`, DB migration, and test execution run in **Build & Test** (after all units).
- Business rules BR1–BR16 encoded in schema constraints + pure logic.
- Property-based tests satisfy the PBT extension (blocking) for U1's core logic.
- Stories: U1 closes none directly (enabling infra); underpins C/D/F/G.
