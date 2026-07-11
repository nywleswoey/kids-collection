# Increment 4 — Admin Gate, Preview & Content: Application Design

**Status**: Ready for approval
**Depth**: Standard (Comprehensive on passcode) · **Cadence**: LIGHT (single design doc)
**Principle**: Additive schema change; reuse existing binder/card + Increment-2/3 effect components; passcode enforced server-side with defense-in-depth; secrets stay server-only; pure cores for PBT.

## New / changed module layout
```
src/db/
  schema.ts                         # + cards.sourceUrl (text, not null, default '')
  migrations/000X_add_source_url.sql  # additive migration
src/features/admin/
  gate.ts                           # server-only: verifyPasscode (constant-time), issue/verify signed gate cookie
  gate-token.ts                     # PURE: HMAC token build/verify (payload+expiry) — PBT
  UnlockForm.tsx                    # "use client" passcode entry form
  catalog.ts                        # getCatalogPreview(): full pool as an owned binder (+sourceUrl); pure mapper split out
  EffectTriggerPanel.tsx            # "use client" buttons → fire SFX/reveal/confetti/set-complete/BGM/asteroid
app/admin/
  unlock/page.tsx                   # passcode prompt (+ server action → set cookie → redirect /admin)
  preview/page.tsx                  # full-catalog binder + effect panel (wrapped in SoundProvider + Asteroids)
  layout.tsx                        # NEW: requireParent() + requireAdminGate() for all /admin/*
src/features/binder/
  CardSlot.tsx / ThemeSection.tsx   # optional `showSource`/admin prop → render source link (admin only)
src/features/card/
  Card.tsx                          # optional `sourceUrl` + `showSource` → admin source link
middleware.ts                       # redirect /admin/* (except /unlock) to /admin/unlock when gate cookie absent
seed/cards.json                     # Superheroes → Dinosaurs (12); + sourceUrl on every card; true facts
src/features/pool/
  seed-schema.ts                    # + sourceUrl: z.string().url()
  writer.ts                         # insertCardIfNew + sourceUrl; add resetPool() for wipe+reseed
  types (src/lib/types.ts)          # Card + sourceUrl
scripts/seed/                       # support --reset (wipe pool before insert) for the theme swap
.env.example                        # + ADMIN_PASSCODE (placeholder), reuse AUTH_SECRET for signing
```

## FR1 — Admin passcode gate (Security)
- **Env**: `ADMIN_PASSCODE` (server-only). Signing key = existing `AUTH_SECRET`.
- **gate-token.ts (PURE)**: `makeToken(expiryMs)` → `base64url(payload).hmacSHA256(payload, secret)`; `verifyToken(token, now)` → boolean (valid signature + not expired). No secret material stored in the cookie beyond the HMAC. → **PBT**: forged/edited tokens never verify; a freshly-made token verifies until expiry.
- **gate.ts (server-only)**: `verifyPasscode(input)` = constant-time compare (`crypto.timingSafeEqual`) of input vs `ADMIN_PASSCODE`; `setGateCookie()` writes signed httpOnly+Secure+SameSite=Lax cookie (`kc.admin.gate`), 8h; `requireAdminGate()` reads+verifies cookie, else `redirect('/admin/unlock')`.
- **Enforcement (defense in depth)**:
  1. `middleware.ts` — `/admin/*` (except `/admin/unlock`) without a valid gate cookie → redirect to `/admin/unlock` (verify via Web Crypto HMAC).
  2. `app/admin/layout.tsx` — `await requireParent(); await requireAdminGate();` so every admin page/server-render re-checks server-side.
- **Unlock flow**: `/admin/unlock` form → server action `verifyPasscode`; success → `setGateCookie()` + redirect `/admin`; failure → generic "Incorrect passcode" (no detail), light in-memory attempt throttle.
- **Secrets**: passcode/token never rendered to client, never logged (SECURITY-03). `.env.example` gets a placeholder only; real value set by the user.

## FR2 — Admin preview binder (full catalog)
- **catalog.ts**: `getCatalogPreview()` loads all themes + cards, builds the same `BinderView` shape as `getBinder` but every card `owned:true, count:1`, and carries `sourceUrl`. Split a **pure** `buildCatalog(themes, cards)` mapper for testing.
- `app/admin/preview/page.tsx` (server) renders `ThemeSection` with an `admin` flag so slots show the source link; wrapped client-side in `<SoundProvider>` + `<Asteroids/>` so effects work off the play layout. Read-only — never touches `collections`.

## FR3 — Effect trigger panel
- `EffectTriggerPanel.tsx` (client, inside the preview's SoundProvider): buttons →
  - Reveal: rarity picker → renders a `RevealCard` demo with the chosen rarity (fires reveal sting + confetti for epic/legendary via existing paths).
  - Confetti burst / Set-complete fanfare (`SetCompleteCelebration` path or direct `play('setComplete')` + `Confetti`).
  - Each SFX button → `useSound().play(name)`.
  - BGM toggle → existing `SoundControls` semantics.
  - Asteroid → force a streak (small prop/imperative on `Asteroids`, or mount a one-shot).
- Honors reduced-motion (visual parts quiet; buttons remain, SFX still audible).

## FR4 — Dinosaurs replace Superheroes
- `seed/cards.json`: drop the Superheroes theme; add **Dinosaurs** (12, same mix):
  - Common (6): Triceratops, Stegosaurus, Ankylosaurus, Parasaurolophus, Iguanodon, Gallimimus
  - Rare (3): Velociraptor, Brachiosaurus, Pteranodon
  - Epic (2): Spinosaurus, Allosaurus
  - Legendary (1): Tyrannosaurus rex
- Images via existing seed image pipeline (imagePrompt per card).
- **resetPool()** (writer) wipes `collections`→`cards`→`themes` (FK order) so the theme swap is clean; seed script gains `--reset`. Test-data wipe per Q6.

## FR5 — Fun fact + source (all cards)
- Schema: `cards.sourceUrl text not null default ''`; migration additive (default keeps existing rows valid pre-reseed).
- `seed-schema.ts`: `sourceUrl: z.string().url()`; `writer.insertCardIfNew` passes it through; `Card` type + `SeedCard` gain `sourceUrl`.
- Content: `eduText` = the fact/blurb (already exists). Real subjects (Animals, Dinosaurs) → true fact + reputable `sourceUrl` (Wikipedia/museum/.edu/.gov). Mythic → text on the myth/legend's origin + source to that legend. Every card populated.
- **Source link is admin-only**: `Card`/`CardSlot` get `showSource` (default false); admin preview + admin card views pass true → render `<a href={sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>`. Kid views unchanged.

## Frozen / untouched
Play-area routes + all `data-testid`; token economy; auth allowlist logic; Increment-2/3 features. Kid-facing card presentation unchanged except the additive (default-off) `showSource` prop.

## Extension compliance
- **Security (enforced)** — passcode server-only + constant-time compare; signed httpOnly+Secure+SameSite cookie carrying only an HMAC token; no secrets in bundle/logs; `.env.example` placeholder; middleware + layout double-check. Verified before completion.
- **Resiliency** — gate fails safe (any verify error → redirect to unlock); preview read-only; `resetPool()`/seed idempotent & re-runnable; migration additive/forward-only.
- **Property-Based Testing** — `gate-token.ts` (forgery/expiry invariants) and `buildCatalog` mapper (all cards owned; counts) get fast-check tests; `seed-schema` url validation covered.

## Design decisions / trade-offs
- **Env passcode + HMAC cookie** (not DB) — matches Q1, zero schema for auth, reuses `AUTH_SECRET`; single shared passcode is acceptable for a family app.
- **Reuse binder/card components with an `admin`/`showSource` flag** — no duplicate UI, keeps kid path untouched and source strictly admin-side.
- **`sourceUrl` default `''` in migration** — keeps the additive migration safe on existing rows; reseed backfills real URLs; every seeded card required-valid via zod.
- **Preview wraps its own SoundProvider + Asteroids** — effects work without moving admin under the play layout.
