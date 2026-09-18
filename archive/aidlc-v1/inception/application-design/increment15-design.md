# INCREMENT 15 — Application Design (Admin Gate TTL + Reward SFX)

Lean design (LIGHT). Maps FR1–FR3. No migration, zero new deps.
References: increment15-requirements.md.

---

## FR1 — Admin gate 20s sliding (admin passcode gate only)

**`gate.ts`**
- `TTL_MS`: `8 * 60 * 60 * 1000` → **`20_000`** (20s).
- `setGateCookie` already derives `maxAge` from `TTL_MS` → becomes 20s automatically. (No other change; token = HMAC over expiry.)

**`middleware.ts` — sliding refresh**
- Today: for `/admin/*` (not `/admin/unlock`), it `verifyToken`s the gate cookie and redirects to `/admin/unlock` if invalid.
- Change: when the token IS valid, **re-issue** a fresh 20s cookie on the response so activity slides the window.
  - Import `makeToken` (Edge-safe, same Web Crypto as `verifyToken`).
  - Build `const res = NextResponse.next()` (import `NextResponse` from `next/server`), then
    `res.cookies.set(GATE_COOKIE, await makeToken(Date.now() + 20_000, secret), { httpOnly, secure(prod), sameSite:"lax", path:"/", maxAge: 20 })` and `return res`.
  - Keep the redirect-to-unlock branch for invalid/absent tokens unchanged.
  - Share the `20_000` TTL — define a small const in middleware (or import from gate) to avoid drift. gate.ts is `server-only`, middleware is Edge → **duplicate the `GATE_TTL_MS = 20_000` const locally** (middleware already re-declares `GATE_COOKIE`), or move the numeric to `gate-token`-adjacent constant. Simplest: local const in middleware mirroring gate.ts, noted in a comment.
- Net: gate stays open while the parent clicks around `/admin/*`; after 20s of no admin request the cookie expires → next `/admin/*` request redirects to unlock. Google/NextAuth session untouched.

**Resiliency:** if `makeToken`/set fails, the still-valid incoming cookie persists to its own expiry — no mid-request lockout.

---

## FR2 — epic / legendary fanfare (layered, all reveals)

**`sfx.ts`**
- Extend `SfxName` union: `+ "epicFanfare" | "legendaryFanfare" | "easterEgg"` (easterEgg used by FR3).
- Add `sfxSpec` cases:
  - `epicFanfare` — fuller than `reveal` (rising arpeggio, ~600ms, gain ~0.34).
  - `legendaryFanfare` — biggest: longer chord/arpeggio (~800ms), higher top note, gain ~0.36 (kept ≤ 1). **Must read as bigger than epic** (longer + more notes) for the test's monotonic intent.
  - `easterEgg` — distinct sparkle/whoosh, unlike `setComplete`.
- New pure helper:
  ```
  export function rewardFanfare(rarity: Rarity): SfxName | null {
    if (rarity === "legendary") return "legendaryFanfare";
    if (rarity === "epic") return "epicFanfare";
    return null;
  }
  ```

**Reveal seams — after the normal reveal sound, layer the fanfare** (`const f = rewardFanfare(card.rarity); if (f) play(f);`):
- `RevealCard.tsx` — in `finish()`, after `play("reveal", rarity)`. (normal pulls)
- `EasterEggPicker.tsx` — on the jackpot reveal (after `setPhase("revealed")`), for the won card. (Q3.3=B: layered with the easter-egg sound.)
- `SacrificePanel.tsx` — when the upgrade result card is shown, for the result rarity.
- `TradeFlow.tsx` — on `phase === "done"`, for `result.got`.

Each seam already has `useSound()` (verify SacrificePanel/TradeFlow — add the hook if absent; TradeFlow already imports it, SacrificePanel already imports it).

---

## FR3 — dedicated easter-egg sound on picker-appear

**`PullButton.tsx`** — the picker-appear moments currently `play("setComplete")`:
- `doPull` branch where `res.easterEgg` is true → `play("easterEgg")`.
- `doSpecialEgg` success → `play("easterEgg")`.
(These are the "you got a special pick!" moments — Q3.2=B.)

**Jackpot reveal** stays in `EasterEggPicker` and layers the FR2 fanfare (above) — both play (Q3.3=B).

`setComplete` remains for its other uses (quiz all-correct, set completion).

---

## Non-Functional
- **Zero deps, no audio files, no migration/seed.**
- **Security:** FR1 shortens + slides the admin gate; token design unchanged (HMAC over expiry, no secret in cookie); middleware re-signs with `AUTH_SECRET` (Edge). No new client exposure. Passcode still server-only.
- **PBT/tests:** extend `tests/sound.test.ts` `ALL_SFX` with the 3 new names; assert `legendaryFanfare` duration ≥ `epicFanfare` duration (bigger). `rewardFanfare` mapping unit test. gate-token expiry PBT unaffected by the smaller TTL.
- Audio respects existing mute/settings; reduced-motion irrelevant to audio.

## New / changed files
| File | Change |
|---|---|
| `src/features/admin/gate.ts` | `TTL_MS` → 20_000 |
| `middleware.ts` | sliding gate-cookie refresh on valid `/admin/*` |
| `src/features/sound/sfx.ts` | +3 SfxName + specs + `rewardFanfare` |
| `src/features/card/RevealCard.tsx` | layer fanfare |
| `src/features/pull/EasterEggPicker.tsx` | layer fanfare on jackpot |
| `src/features/pull/PullButton.tsx` | `easterEgg` on picker-appear |
| `src/features/pull/SacrificePanel.tsx` | fanfare on upgrade result |
| `src/features/trade/TradeFlow.tsx` | fanfare on got card |
| `tests/sound.test.ts` | new SFX + rewardFanfare |

## Test plan
- sfxSpec valid for new names; legendary ≥ epic duration.
- `rewardFanfare`: legendary→legendaryFanfare, epic→epicFanfare, common/rare→null.
- Existing 90/90 green.
