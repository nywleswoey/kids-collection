# INCREMENT 15 — Admin Gate TTL + Reward SFX

**Type**: Brownfield enhancement (security + sensory).
**Cadence**: LIGHT — single increment (Q4=A).
**Migration**: NONE. **Deps**: zero new (SFX are synth recipes).
**Answers**: increment15-questions.md.

---

## FR1 — Admin gate auto-logout after 20s idle (Q1.1=B, Q1.2=A, Q1.3=B)
- **Scope: the admin passcode gate cookie** (`kc.admin.gate`), NOT the Google/NextAuth session. The parent's Google login stays at its long default; only the `/admin/*` passcode gate re-prompts.
- **Duration: 20 seconds** (literal — user confirmed B). `gate.ts` `TTL_MS` 8h → **20_000 ms**.
- **Sliding / idle (Q1.2=A):** each `/admin/*` request refreshes the cookie to a fresh 20s expiry, so the gate stays open while the parent is actively using admin and closes after **20s of no admin activity** → redirect to `/admin/unlock`.
- **Mechanism:** the refresh happens in **`middleware.ts`** (already verifies the gate token for `/admin/*`; `gate-token` is Edge-safe Web Crypto). On a valid token, re-issue the cookie on the response with a new 20s expiry. (Page render can't set cookies in Next App Router, so middleware is the correct seam.)
- `setGateCookie` `maxAge` also drops to 20s so a fresh unlock matches.
- ⚠️ Product note (surfaced at scoping): 20s is aggressive — a 20s pause in the admin area forces a re-unlock. Chosen deliberately.

## FR2 — Distinct fanfare on epic / legendary reveal (Q2.1=B, Q2.2=A, Q2.3=A)
- **Two new SFX** (Q2.1=B): `epicFanfare` and a bigger/fuller `legendaryFanfare`.
- **Layered (Q2.2=A):** keep the existing rarity-scaled `reveal` sting; play the fanfare on top when the revealed card is epic or legendary.
- **All reveal contexts (Q2.3=A):** normal pull, easter-egg jackpot, sacrifice upgrade, and trade "you got" reveal. A small shared helper plays the correct fanfare by rarity at each reveal seam.

## FR3 — Dedicated easter-egg sound (Q3.1=A, Q3.2=B, Q3.3=B)
- **New SFX `easterEgg`** — distinct from `setComplete`.
- **Fires when the special picker APPEARS (Q3.2=B)** — the "you got a special pick!" moment — for both the random easter egg and special-ticket picks (`PullButton` currently plays `setComplete` there).
- **On the jackpot reveal**, if the won card is epic/legendary, the FR2 fanfare also plays — **both layered (Q3.3=B)**.

---

## Non-Functional / Constraints
- **Zero new npm deps, no audio files** (SFX are Web-Audio synth recipes in `sfx.ts`). No migration, no seed.
- **Security:** FR1 tightens the admin gate (shorter-lived, sliding). No secret material added to cookie (unchanged token design — HMAC over expiry only). Passcode still server-only. Middleware refresh re-signs with `AUTH_SECRET` (Edge). No new client exposure.
- **Property-Based Testing** enabled: new `sfxSpec` cases stay pure and covered like existing ones; gate-token TTL behavior remains PBT-covered (verifyToken expiry).
- **Resiliency:** if middleware refresh fails, the existing (still-valid) cookie remains until its own expiry — no lockout mid-request.
- Reduced-motion unaffected (audio respects existing sound settings/mute).

## Out of Scope
- Shortening the Google/NextAuth session itself (Q1.3=A not chosen).
- Absolute (non-sliding) expiry (Q1.2=B not chosen).
- Sound files / external audio assets.

## Test Impact
- Existing 90/90 stay green.
- New: `sfxSpec` returns well-formed recipes for `epicFanfare`/`legendaryFanfare`/`easterEgg` (extend sfx test); assert legendary fanfare is bigger/longer than epic (monotonic intent). gate-token expiry PBT still holds with the new TTL.

## Affected Modules (indicative)
- `src/features/admin/gate.ts` — `TTL_MS` → 20s; `setGateCookie` maxAge.
- `middleware.ts` — sliding refresh of the gate cookie on valid `/admin/*` requests (`makeToken` + set cookie on response).
- `src/features/sound/sfx.ts` — add `epicFanfare`, `legendaryFanfare`, `easterEgg` to `SfxName` + `sfxSpec`; small `rewardFanfare(rarity)` helper (epic/legendary → name | null).
- Reveal seams: `RevealCard.tsx` (pull), `EasterEggPicker.tsx` (jackpot reveal + picker-appear sound moved to `easterEgg`), `SacrificePanel.tsx` (result), `TradeFlow.tsx` (got card).
- `PullButton.tsx` — play `easterEgg` when the picker appears (replaces `setComplete` at those seams).
- `tests/sound.test.ts` — extend for new SFX.
