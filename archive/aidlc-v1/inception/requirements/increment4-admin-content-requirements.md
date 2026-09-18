# Increment 4 — Admin Gate, Preview & Content: Requirements

**Status**: Ready for approval
**Type**: Brownfield — Enhancement + Content + Security. Includes a DB schema migration + reseed.
**Depth**: Standard (Comprehensive on the passcode, per Security extension)
**Source**: User request + answers in `increment4-admin-content-questions.md`.

## Intent
Lock the parent admin behind a passcode; give the parent a full-catalog preview with on-demand effect triggers; swap the fictional Superheroes theme for real Dinosaurs; and attach a true, sourced fun fact to every card (with the source link visible in admin for fact-checking).

## Decisions (from answers)
| # | Topic | Decision |
|---|---|---|
| 1 | Passcode mechanism | Single shared passcode in env var `ADMIN_PASSCODE`, compared server-side |
| 2 | Passcode scope/session | Gate all `/admin/*`; remembered via signed httpOnly cookie; re-prompt after expiry |
| 3 | Preview contents | Full catalog — every pool card shown as "owned", grouped by theme |
| 4 | Effect triggers | All: reveal (per rarity), confetti, set-complete fanfare, each SFX, BGM toggle, asteroid |
| 5 | Dinosaur roster | 12 dinos, same rarity mix (6 common / 3 rare / 2 epic / 1 legendary) |
| 6 | Superhero-owner migration | Test data — wipe & reseed; no legacy preservation |
| 7 | Fact + source coverage | **All** cards get a source. Real subjects (Animals, Dinosaurs) → true fact + source. Fictional (Mythic) → text on how the myth/legend arose + source to that legend |
| 8 | Data model | Reuse `eduText` as the fact/blurb + add new `sourceUrl` column |
| 9 | Source link placement | Admin only (kids never see the link) |
| 10 | Scope | All four features together |

## Functional Requirements

### FR1 — Admin passcode gate (Security)
- All `/admin/*` routes require a passcode **in addition to** existing parent Google auth (guard runs first, then passcode).
- Passcode value read from server-only env `ADMIN_PASSCODE`; never sent to the client, never in the bundle.
- A passcode entry page/form; on correct entry, set a **signed, httpOnly, Secure, SameSite=Lax cookie** carrying a gate token (NOT the passcode) with a bounded lifetime (default 8h); admin routes check it server-side.
- Wrong passcode → generic error, no lockout leak; light throttling acceptable.
- Sign-out / cookie expiry re-prompts.

### FR2 — Admin preview binder (full catalog)
- New admin page showing **every card in the pool** as fully owned, grouped by theme, reusing the existing binder/card presentation (so it looks exactly like a kid's completed binder).
- Read-only; does not touch any child's real collection.

### FR3 — Admin effect trigger panel
- On the preview page, buttons that fire each effect on demand: card reveal (choose rarity → shows the reveal + rarity sting), confetti burst, set-complete fanfare, each SFX (click/packOpen/flip/reveal/tokenChime/denied/setComplete), BGM toggle, asteroid streak.
- Reuses Increment-2 sound engine + Increment-3 asteroid; honors reduced-motion (visual effects quiet, buttons still present).

### FR4 — Dinosaurs replace Superheroes
- Remove the Superheroes theme + its 12 cards from the seed; add a **Dinosaurs** theme with 12 real dinosaurs (kid-friendly, well known), same rarity distribution.
- Reseed wipes and rebuilds pool content (test data — no legacy migration). Images via existing seed image pipeline.

### FR5 — True fun fact + source per card
- Add `sourceUrl` to every card; populate for **all** cards:
  - Animals + Dinosaurs → a true, verifiable fun fact (in `eduText`) + reputable source (Wikipedia / museum / .edu / .gov).
  - Mythic Creatures → `eduText` describes the myth/legend's origin + source to that legend.
- **Source link shown admin-only** (preview binder + admin card views). Kids' card detail keeps showing `eduText`, never the link.

## Non-Functional Requirements

### NFR1 — Security (extension: enforced)
- SECURITY-03: passcode/token never logged; no secrets in client output.
- Passcode compared server-side with a **constant-time** comparison; only `ADMIN_PASSCODE` (server env) is authoritative.
- Gate cookie is signed + httpOnly + Secure + SameSite; contains no secret material.
- `.env.example` documents `ADMIN_PASSCODE` (placeholder only, no real value committed).

### NFR2 — Data migration
- Additive schema change (`cards.sourceUrl`) via a Drizzle migration; forward-only, no destructive change to `children`/`collections` structure.
- Reseed is idempotent and safe to re-run; documented command (`pnpm seed`).

### NFR3 — No functional regression
- Existing play flow, auth, token economy, Increment-2/3 features unchanged. All existing `data-testid` preserved. Existing 33 tests stay green.

### NFR4 — Content quality / accessibility
- Facts must be accurate and each backed by a working source URL (parent-verifiable).
- Source links open in a new tab with `rel="noopener noreferrer"`; admin-only.

## Out of Scope
- Editing card content through the UI (facts/sources authored in seed).
- Kid-facing source links; per-parent PINs; admin account management.
- Changing route structure of the play area.

## Extension Compliance (enabled: Security, Resiliency, Property-Based Testing)
- **Security** — **APPLICABLE & enforced** this increment (passcode gate). Constraints in NFR1; verified before stage completion. No secrets in bundle/logs; constant-time compare; signed httpOnly cookie.
- **Resiliency** — light: passcode check + admin preview must fail safe (deny on any gate error; preview read-only can't corrupt data). Reseed re-runnable.
- **Property-Based Testing** — applicable to new pure logic: gate-token verification and any passcode/format helpers, and (if added) a pure "build full-catalog binder" mapper. Add fast-check tests for pure cores; keep existing suite green.

## Acceptance Criteria
1. Visiting `/admin/*` without the passcode cookie → passcode prompt; correct passcode → access + signed httpOnly cookie; wrong → denied. Passcode never appears client-side or in logs.
2. Admin preview page shows the entire pool as a completed binder; buttons trigger reveal/confetti/set-complete/SFX/BGM/asteroid on demand.
3. Pool has a **Dinosaurs** theme (12 cards, 6/3/2/1) and **no** Superheroes; reseed runs clean.
4. Every card has a populated `sourceUrl`; admin views show the source link (kids' views do not).
5. `pnpm typecheck` clean, `pnpm build` succeeds, migration applies, tests green (≥33 + new PBT), zero unjustified new deps.
