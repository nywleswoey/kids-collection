# INCREMENT 15 — Code Generation Plan

LIGHT. No migration/seed, zero deps. Target: 90/90 stay green + new SFX tests.

## FR1 — Admin gate 20s sliding
- [ ] `src/features/admin/gate.ts` — `TTL_MS` 8h → `20_000`
- [ ] `middleware.ts` — on valid `/admin/*` token, re-issue gate cookie (makeToken + NextResponse.next().cookies.set, 20s); keep redirect-to-unlock for invalid

## FR2 — epic/legendary fanfare (layered, all reveals)
- [ ] `sfx.ts` — add `epicFanfare`, `legendaryFanfare`, `easterEgg` to SfxName + sfxSpec (legendary bigger/longer than epic); `rewardFanfare(rarity): SfxName | null`
- [ ] `RevealCard.tsx` — layer fanfare after reveal
- [ ] `EasterEggPicker.tsx` — layer fanfare on jackpot reveal (won card)
- [ ] `SacrificePanel.tsx` — fanfare on upgrade result
- [ ] `TradeFlow.tsx` — fanfare on got card (done phase)

## FR3 — easter-egg sound on picker-appear
- [ ] `PullButton.tsx` — `play("easterEgg")` at doPull(res.easterEgg) + doSpecialEgg success (replace setComplete there)

## Tests
- [ ] `tests/sound.test.ts` — add 3 new SFX to ALL_SFX; assert legendaryFanfare duration ≥ epicFanfare; `rewardFanfare` mapping (epic/legendary/none)

## Verify
- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` — 90 + new green
- [ ] `pnpm build` ✅ (middleware compiles for Edge)
- [ ] zero deps, no migration, no secret in client bundle
- [ ] `increment15/code-summary.md`
