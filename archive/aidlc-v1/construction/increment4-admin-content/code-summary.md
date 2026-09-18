# Increment 4 — Admin Gate, Preview & Content: Code Summary

**Status**: Implemented; typecheck/tests/build green. **DB migration + reseed pending (user-run).**
**Plan**: `increment4-admin-content-code-generation-plan.md` (steps 1–11 done; step-10 DB apply deferred to user).

## Files added (11)
- `src/db/migrations/0001_gray_gabe_jones.sql` — additive `ALTER TABLE cards ADD COLUMN source_url`.
- `src/features/admin/gate-token.ts` — PURE, isomorphic HMAC token (Web Crypto): `makeToken`/`verifyToken`, constant-time compare. No secret stored in the token.
- `src/features/admin/gate.ts` — server-only: `verifyPasscode` (constant-time, SHA-256 digests), `setGateCookie`, `hasAdminGate`, `requireAdminGate`.
- `src/features/admin/unlock-action.ts` — server action: verify passcode → set cookie → redirect.
- `src/features/admin/UnlockForm.tsx` — passcode entry (client).
- `src/features/admin/catalog-model.ts` — PURE `buildCatalog` (full pool → completed binder).
- `src/features/admin/catalog.ts` — server-only `getCatalogPreview` (+ re-exports buildCatalog).
- `src/features/admin/EffectTriggerPanel.tsx` — client: buttons for reveal/confetti/set-complete/SFX/BGM/asteroid.
- `app/admin/layout.tsx` — `requireParent()` for all /admin/*.
- `app/admin/unlock/page.tsx` — passcode prompt (ungated to avoid loop).
- `app/admin/preview/page.tsx` — full-catalog preview + effect panel, own SoundProvider.
- Tests: `tests/gate-token.pbt.test.ts`, `tests/catalog.test.ts`.

## Files changed (12)
- `src/db/schema.ts` — `cards.sourceUrl` (notNull, default '').
- `src/lib/types.ts` — `Card.sourceUrl`.
- `src/features/pool/seed-schema.ts` — `sourceUrl: z.string().url()`.
- `src/features/pool/writer.ts` — `insertCardIfNew` + sourceUrl; new `resetPool()`.
- `src/features/pool/service.ts` — map `sourceUrl`.
- `scripts/seed/index.ts` — pass sourceUrl; `--reset` wipes pool first.
- `seed/cards.json` — Superheroes→Dinosaurs (12); `sourceUrl` on all 36 cards; true facts (Wikipedia).
- `middleware.ts` — admin gate cookie check (redirect to /admin/unlock).
- `app/admin/page.tsx` — `requireAdminGate()` + Preview nav link.
- `app/admin/profiles/page.tsx`, `app/admin/child/[childId]/binder/page.tsx` — `requireAdminGate()`.
- `src/features/binder/ThemeSection.tsx` + `CardSlot.tsx` — `admin`/`showSource` (admin-only source link, no play link, no auto-celebration).
- `src/features/anim/Asteroids.tsx` — optional `trigger` prop (on-demand streak).
- `.env.example` — `ADMIN_PASSCODE` placeholder.
- Test fixtures updated for `sourceUrl` (binder, logic.pbt, pool).

## Security compliance (extension: enforced)
- **Passcode server-only**: `ADMIN_PASSCODE` read in server code only; **grep confirms it is absent from `.next/static`** (client bundle). `AUTH_SECRET` also absent from client.
- **Constant-time compare** of passcode (SHA-256 digest equality, no length/short-circuit leak).
- **Gate cookie**: httpOnly + Secure(prod) + SameSite=Lax, holds only an HMAC token (payload = expiry), signed with `AUTH_SECRET`; 8h TTL. No passcode/secret inside.
- **No secrets logged**; generic "Incorrect passcode" (no enumeration).
- **Defense in depth**: middleware redirect + per-page `requireAdminGate()`.
- **SECURITY findings**: none blocking.

## Verification
- `pnpm typecheck` — clean.
- `pnpm test` — **42/42** (was 33; +5 gate-token PBT, +3 catalog, +1 seed sourceUrl).
- `pnpm build` — compiled; routes `/admin/unlock`, `/admin/preview` present; **zero** dep changes.
- Client-bundle secret grep — clean.

## Pending (user-run, DB writes)
1. **Apply migration**: `pnpm db:migrate` (adds `cards.source_url`).
2. **Delta sync (recommended)**: `pnpm seed --sync` — generates images ONLY for the 12 new Dinosaurs, backfills `eduText`/`sourceUrl` on existing cards in place (no image regen), and prunes Superheroes. Full rebuild `pnpm seed --reset --publish` remains available (regenerates all 36 images). Both need `BLOB_READ_WRITE_TOKEN`.
3. **Set `ADMIN_PASSCODE`** in `.env.local` (and Vercel env) — pick your own value.

Seed modes: `--review` (images to disk, no DB) · `--publish` (insert new only) · `--publish --reset` (wipe + rebuild all) · `--sync` (delta: new images only + update existing text + prune).

I was blocked earlier from writing to the Neon DB (shared/prod). These three steps are left for the user (or explicit authorization).
