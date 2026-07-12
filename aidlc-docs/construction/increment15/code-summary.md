# INCREMENT 15 — Code Generation Summary

LIGHT. typecheck clean, **92/92 tests** (90 + 2 new), build ✅ (middleware Edge OK), zero new deps, no migration/seed, no secret in client bundle.

## FR1 — Admin gate 20s sliding
- `gate.ts` — `TTL_MS` 8h → **`GATE_TTL_MS = 20_000`**; `setGateCookie` maxAge follows.
- `middleware.ts` — on a valid `/admin/*` gate token, **re-issues** the cookie (`makeToken(now+20s)` on `NextResponse.next()`, maxAge 20) so activity slides the window; invalid/absent → redirect to `/admin/unlock` (unchanged). Local `GATE_TTL_MS` mirror (gate.ts is server-only, can't import into Edge). Google/NextAuth session untouched (Q1.3=B).

## FR2 — epic/legendary reward fanfare (layered, all reveals)
- `sfx.ts` — `SfxName` +`epicFanfare`/`legendaryFanfare`/`easterEgg`; `sfxSpec` recipes (legendary bigger: 5 notes / 900ms vs epic 3 / 620ms); new pure `rewardFanfare(rarity): SfxName | null`.
- Layered after the existing reveal sound at all reveal seams (Q2.3=A):
  - `RevealCard.tsx` (normal pull), `EasterEggPicker.tsx` (jackpot, Q3.3=B layered), `SacrificePanel.tsx` (upgrade result), `TradeFlow.tsx` (got card).

## FR3 — dedicated easter-egg sound
- `PullButton.tsx` — `play("easterEgg")` at picker-appear (Q3.2=B): both the random easter egg (`doPull` `res.easterEgg`) and special-ticket picks (`doSpecialEgg`). Replaced `setComplete` at those two seams; `setComplete` retained for quiz/set-complete.

## Security / NFR
- FR1 tightens + slides the admin gate; token design unchanged (HMAC over expiry, no secret in cookie); middleware re-signs with `AUTH_SECRET` (Edge). No new client exposure; passcode server-only.
- No secret in `.next/static` (AUTH_SECRET/ADMIN_PASSCODE/DATABASE_URL/PARENT_EMAILS absent).
- ⚠️ 20s is aggressive by design (user Q1.1=B) — 20s admin idle → re-unlock.

## Tests (2 new)
- `tests/sound.test.ts` — 3 new SFX in ALL_SFX recipe check; `legendaryFanfare` duration+notes ≥ `epicFanfare`; `rewardFanfare` maps only epic/legendary.

## Files
EDIT: src/features/admin/gate.ts, middleware.ts, src/features/sound/sfx.ts, src/features/card/RevealCard.tsx, src/features/pull/{EasterEggPicker,PullButton,SacrificePanel}.tsx, src/features/trade/TradeFlow.tsx, tests/sound.test.ts
