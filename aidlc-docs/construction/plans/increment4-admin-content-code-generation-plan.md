# Increment 4 — Admin Gate, Preview & Content: Code Generation Plan

**Status**: Awaiting approval (Part 1)
**Type**: Brownfield — schema migration + reseed + auth + admin UI. Source of truth for Code Gen.
**Design**: `increment4-admin-content-design.md`. Cookie signed with existing `AUTH_SECRET` (reuse, per approval).
**Frozen**: play-area routes, all `data-testid`, token economy, auth allowlist logic, Increment-2/3 features, kid-facing card presentation (except additive default-off `showSource`).

## Story / requirement coverage
FR1 passcode gate · FR2 catalog preview · FR3 effect triggers · FR4 dinosaur swap · FR5 fact+source · NFR1 security · NFR2 migration · NFR3 no-regression · NFR4 content quality.

---

## Step 1 — Schema + migration (FR5, NFR2)
- [ ] `src/db/schema.ts`: add `sourceUrl: text("source_url").notNull().default("")` to `cards`.
- [ ] Generate Drizzle migration (`pnpm db:generate`) — additive `ADD COLUMN`.
- [ ] `src/lib/types.ts`: add `sourceUrl: string` to `Card`.

## Step 2 — Seed schema + writer + reset (FR4, FR5, NFR2)
- [ ] `src/features/pool/seed-schema.ts`: add `sourceUrl: z.string().url()` to `seedCardSchema`.
- [ ] `src/features/pool/writer.ts`: `insertCardIfNew` accepts + inserts `sourceUrl`; add `resetPool()` (delete collections → cards → themes, FK order).
- [ ] `scripts/seed/*`: support `--reset` (call `resetPool()` before insert) for the theme swap.

## Step 3 — Seed content: dinosaurs + facts + sources (FR4, FR5)
- [ ] `seed/cards.json`: remove Superheroes theme; add **Dinosaurs** (12: T. rex[L]; Spinosaurus,Allosaurus[E]; Velociraptor,Brachiosaurus,Pteranodon[R]; Triceratops,Stegosaurus,Ankylosaurus,Parasaurolophus,Iguanodon,Gallimimus[C]) with true facts + imagePrompt.
- [ ] Add `sourceUrl` to **every** card (Animals + Dinosaurs = true fact source; Mythic = myth/legend origin source). Reputable hosts (Wikipedia/museum/.edu/.gov).

## Step 4 — Passcode gate core (FR1, NFR1) — Security
- [ ] `src/features/admin/gate-token.ts` (PURE): `makeToken(expiryMs)` / `verifyToken(token, now)` using HMAC-SHA256 over payload with `AUTH_SECRET`. No secret inside cookie beyond the HMAC.
- [ ] `src/features/admin/gate.ts` (server-only): `verifyPasscode(input)` constant-time compare vs `ADMIN_PASSCODE`; `setGateCookie()` (signed, httpOnly, Secure, SameSite=Lax, 8h); `requireAdminGate()` → verify cookie else `redirect('/admin/unlock')`.

## Step 5 — Gate enforcement + unlock flow (FR1)
- [ ] `app/admin/layout.tsx` (NEW): `await requireParent(); await requireAdminGate();` wrapping all `/admin/*`.
- [ ] `app/admin/unlock/page.tsx` + `UnlockForm.tsx`: passcode form → server action `verifyPasscode` → `setGateCookie()` + redirect `/admin`; generic error on failure; light attempt throttle.
- [ ] `middleware.ts`: `/admin/*` except `/admin/unlock` without valid gate cookie → redirect `/admin/unlock` (Web Crypto HMAC verify).
- [ ] `.env.example`: add `ADMIN_PASSCODE=` placeholder (no real value); note `AUTH_SECRET` reused for signing.

## Step 6 — Catalog preview service + page (FR2)
- [ ] `src/features/admin/catalog.ts`: pure `buildCatalog(themes, cards)` → `BinderView` with all cards `owned:true, count:1` + `sourceUrl`; `getCatalogPreview()` loads data + calls it.
- [ ] `app/admin/preview/page.tsx`: render themes via `ThemeSection` with `admin` flag; wrap client tree in `<SoundProvider>` + `<Asteroids/>`. Read-only.
- [ ] Add a link to Preview from the admin dashboard.

## Step 7 — Effect trigger panel (FR3)
- [ ] `src/features/admin/EffectTriggerPanel.tsx` (client): buttons → reveal-by-rarity (RevealCard demo), confetti, set-complete, each SFX (`useSound().play`), BGM toggle, force-asteroid. Reduced-motion safe.

## Step 8 — Admin-only source link (FR5, NFR4)
- [ ] `src/features/card/Card.tsx` + `src/features/binder/CardSlot.tsx` + `ThemeSection.tsx`: add optional `showSource` (default false); when true, render `<a target="_blank" rel="noopener noreferrer">Source</a>`. Kid paths pass nothing (unchanged).

## Step 9 — Tests (NFR1, PBT extension, NFR3)
- [ ] `tests/gate-token.pbt.test.ts`: forged/tampered/expired tokens never verify; fresh token verifies before expiry (fast-check).
- [ ] `tests/catalog.test.ts`: `buildCatalog` marks all owned, correct totals.
- [ ] Update/confirm seed test covers `sourceUrl` url validation. Existing 33 stay green.

## Step 10 — Verify (acceptance criteria)
- [ ] `pnpm typecheck` clean; `pnpm test` green (≥33 + new); `pnpm build` succeeds; migration applies.
- [ ] No secrets in bundle/logs; grep confirms `ADMIN_PASSCODE` only server-side; `.env.example` placeholder only.
- [ ] Manual: `/admin` → unlock prompt → passcode → preview + effects; source links admin-only; Dinosaurs present, Superheroes gone.

## Step 11 — Summary doc
- [ ] `aidlc-docs/construction/increment4-admin-content/code-summary.md` (files, security compliance, verification).

---
**Scope**: ~1 migration, ~8 new files, ~8 edits, 1 seed rewrite. Security-sensitive (passcode) — server-only secrets, constant-time compare, signed cookie.
