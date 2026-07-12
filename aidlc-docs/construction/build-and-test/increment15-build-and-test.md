# INCREMENT 15 — Build & Test Instructions

LIGHT. No migration/seed, no env changes.

## Build / Test
```bash
pnpm typecheck   # clean
pnpm test        # 92 passing
pnpm build       # success; Middleware compiles for Edge
```
New tests: `tests/sound.test.ts` — 3 new SFX recipes valid; `legendaryFanfare` ≥ `epicFanfare` (duration + notes); `rewardFanfare` mapping.

## Manual QA
1. **FR1 admin 20s**: unlock `/admin` with passcode. Click around admin → stays unlocked. Wait **>20s** with no admin request → next `/admin/*` navigation redirects to `/admin/unlock`. Confirm `/play/*` and the Google login are NOT affected (only the passcode gate re-prompts).
2. **FR2 fanfare**: pull/reveal an **epic** → hear reveal + epic fanfare; a **legendary** → bigger fanfare. Verify it also fires on easter-egg jackpot, sacrifice upgrade, and a trade where you receive an epic/legendary. Common/rare = no fanfare.
3. **FR3 easter egg**: trigger an easter egg / use a special ticket → distinct `easterEgg` cue when the picker appears (not the old set-complete sound). If the won card is epic/legendary, the fanfare also plays on reveal.
4. Mute via sound settings silences all of the above.

## Security notes
- Gate token unchanged (HMAC over expiry, no secret in cookie); middleware re-signs with `AUTH_SECRET` on the Edge. No secret in client bundle (verified).
- 20s gate window is intentional (aggressive).

## Deploy
- Push `main` → Vercel prod. **No `db:migrate`, no `seed`.**
