# INCREMENT 15 — Code Generation Plan

LIGHT. No migration/seed, zero deps. Target: 90/90 stay green + new SFX tests.

## FR1 — Admin gate 20s sliding
- [x] `src/features/admin/gate.ts` — `TTL_MS` 8h → `20_000`
- [x] `middleware.ts` — on valid `/admin/*` token, re-issue gate cookie (makeToken + NextResponse.next().cookies.set, 20s); keep redirect-to-unlock for invalid

## FR2 — epic/legendary fanfare (layered, all reveals)
- [x] `sfx.ts` — add `epicFanfare`, `legendaryFanfare`, `easterEgg` to SfxName + sfxSpec (legendary bigger/longer than epic); `rewardFanfare(rarity): SfxName | null`
- [x] `RevealCard.tsx` — layer fanfare after reveal
- [x] `EasterEggPicker.tsx` — layer fanfare on jackpot reveal (won card)
- [x] `SacrificePanel.tsx` — fanfare on upgrade result
- [x] `TradeFlow.tsx` — fanfare on got card (done phase)

## FR3 — easter-egg sound on picker-appear
- [x] `PullButton.tsx` — `play("easterEgg")` at doPull(res.easterEgg) + doSpecialEgg success (replace setComplete there)

## Tests
- [x] `tests/sound.test.ts` — add 3 new SFX to ALL_SFX; assert legendaryFanfare duration ≥ epicFanfare; `rewardFanfare` mapping (epic/legendary/none)

## Verify
- [x] `pnpm typecheck` clean
- [x] `pnpm test` — 90 + new green
- [x] `pnpm build` ✅ (middleware compiles for Edge)
- [x] zero deps, no migration, no secret in client bundle
- [x] `increment15/code-summary.md`
