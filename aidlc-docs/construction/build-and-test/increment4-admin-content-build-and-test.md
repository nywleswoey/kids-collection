# Increment 4 — Admin Gate, Preview & Content: Build & Test Instructions

**Scope**: Security (passcode), schema migration, reseed (content), admin UI. New automated tests added for the pure/security cores; existing suite guards regression.

## Build
```bash
pnpm install      # zero new dependencies
pnpm typecheck
pnpm build
```
Expected: typecheck clean; build compiles; routes `/admin/unlock` and `/admin/preview` present; no package.json / lockfile changes.

## Automated tests
```bash
pnpm test         # vitest run
```
Expected: **42/42 pass** — includes new `gate-token.pbt` (forgery/expiry/tamper) and `catalog` tests, plus `sourceUrl` seed validation.

## Database (USER-RUN — writes to Neon)
```bash
pnpm db:migrate                 # applies 0001: cards.source_url
pnpm seed --sync                # DELTA (recommended): only new cards get images
```
`--sync` behavior (no full image regen):
- Generates + uploads images ONLY for cards new to the DB (the 12 Dinosaurs).
- Updates `eduText` + `sourceUrl` in place on existing cards (Animals, Mythic) — no image touched.
- Prunes themes/cards dropped from the seed (removes Superheroes + its cards; collections cascade).
- Report shows `{inserted, updated, prunedThemes, prunedCards, ...}`.

Full-rebuild alternative (regenerates ALL 36 images — slower, only if you want fresh art):
```bash
pnpm seed --reset --publish
```
- Set `ADMIN_PASSCODE` in `.env.local` (and Vercel env) before using admin.
- Both paths need `BLOB_READ_WRITE_TOKEN` for image upload.

## Manual QA
1. `/admin` without the gate cookie → redirected to `/admin/unlock`; wrong passcode → "Incorrect passcode"; correct → dashboard (cookie set, ~8h).
2. `/admin/preview` → whole pool as a completed binder; each card shows an admin-only **🔗 Source** link (kid card detail does NOT).
3. Effect panel → reveal-by-rarity, confetti, set-complete, each SFX, BGM toggle, asteroid all fire; reduced-motion quiets visuals, SFX still audible.
4. Pool shows **Dinosaurs**, no Superheroes; facts read true and the source link matches.
5. Kid flow (play/binder/pull) unchanged; no source links leak to kids.

## Security verification (extension)
- `ADMIN_PASSCODE` and `AUTH_SECRET` absent from `.next/static` (client bundle) — confirmed by grep.
- Passcode compared constant-time; gate cookie is httpOnly + Secure(prod) + SameSite, HMAC token only.
- No blocking security findings.

## Verification results (this run)
- typecheck clean ✅ · `pnpm test` 42/42 ✅ · `pnpm build` ✅ · zero new deps ✅ · client-bundle secret grep clean ✅
- DB migration + reseed: **pending (user-run)**.

## Acceptance criteria — status
1. Passcode gate on `/admin/*`, secret server-only, generic errors — ✅ (code + security grep; live check after deploy)
2. Preview binder + effect triggers — ✅
3. Dinosaurs replace Superheroes; reseed clean — ✅ code; **runs on user reseed**
4. Every card has sourceUrl; admin-only link — ✅ code; live after migration+reseed
5. typecheck/build/tests green, migration applies, zero new deps — ✅ (migration apply pending user)
