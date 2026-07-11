# INCREMENT 10 — Build & Test Instructions

## Automated (done)
- `pnpm typecheck` — clean.
- `pnpm test` — **61/61**, stable ×3.
- `pnpm build` — succeeds; `/play/home` and `/play/pull` compile; no client-bundle secret (`AUTH_SECRET`/`ADMIN_PASSCODE`/`GOOGLE_SECRET` absent from `.next/static`).
- Seed validated: `loadSeed('seed/cards.json')` → 6 themes, 180 cards.

## Seed / image generation (REQUIRED before new categories appear)
The two new themes have no DB rows until seeded. Image gen uses Pollinations (no API key); needs `DATABASE_URL` + `BLOB_READ_WRITE_TOKEN` in `.env.local`.

1. **Dry-run (optional, no writes):** `pnpm seed --review` → images to `seed/review/`, inspect Country + Famous People art (esp. portrait quality of the 30 people).
2. **Apply (delta, safe):** `pnpm seed --sync`
   - Inserts only NEW cards (60: Country + Famous People); existing 4 themes + kids' collections untouched; updates text in place.
   - ~60 image-gen calls, throttled (`SEED_THROTTLE_MS`, default 3s) → a few minutes.
3. **Production:** after deploy, run `pnpm seed --sync` against the prod `DATABASE_URL` (same pattern as prior content increments). No migration this increment.

## Manual / visual QA
- **FR1**: child with only special tickets (0 normal) → `/play/home` shows `🎟️ 0 tickets ready` **and** `✨ N special tickets`. Child with 0 special → no special pill.
- **FR2**: on `/play/pull` — normal=0 + has special → ask-parent hidden, Discover greyed/disabled, special ✨/🍀 buttons active, "use a special ticket" hint shown. normal=0 + no special → ask-parent shown.
- **FR3**: binder card-detail back, profile picker, admin, card source links all render as buttons (no dashed-underline text links).
- **FR4/FR5**: after seed — GalaxyView shows 6 category tabs (★ All + 6) wrapping cleanly; pull chips show 6 + Random; Country cards = landmarks, Famous People = portraits; each card detail shows fact + Source button.
- Sound/animation unaffected.

## Deploy
- Push `main` → Vercel prod (auto). No migration. After deploy: run `pnpm seed --sync` against prod DB to publish the 60 new cards + images.
