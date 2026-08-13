# Technical State
- Status: complete — approved by user 2026-08-12T23:23Z (artefact-verification gate passed)
- Depth: quick
- Scope: Parent gate auth — WebAuthn passkey replacing `ADMIN_PASSCODE` on the `/admin/*` gate

## Questions
- [x] T1 [CORE] — Library — **a** `@simplewebauthn/server` + `@simplewebauthn/browser`
- [x] T2 [CORE] — `rpID` — prod host `kids-collection.vercel.app`; `/admin` unused on previews;
      **c** Google re-auth is the preview path. Follow-on: OQ-PG-6 (env-derived `rpID`, public suffix)
- [x] T3 [CORE] — **i** follow the store seam (7 → 8 tables); **ii** store counter, do not enforce;
      key on Google `sub`
- [x] T4 [CORE] — **i** confirmed, gate machinery untouched; **ii** signed-token challenge, no table
- [x] T5 [CORE] — **a** two-deploy cutover; **ii** safety net = `git revert` + redeploy (OQ-PG-7)
- [x] T6 [CORE] — **a + c** manual checklist + captured real assertion as fixture; no Playwright
- [x] T7 [CORE] — both deps accepted; 5 must-not-break items hold (item 2 needs active check);
      `vision-document.md:269` restated mechanism-agnostically

## Pre-declared open questions
- OQ-PG-6 — `rpID` must be environment-derived and the passkey path disabled on non-matching hosts;
  `vercel.app` is a public suffix. Correctness requirement for T2(c), not a refinement
- OQ-PG-7 — the T5-ii safety net weakens after deploy 2 (env restore stops working; only revert remains)
- OQ-PG-8 — challenge expiry value unchosen; signed challenge is replayable within its window

## Inherited from the business role
- Carried open questions: OQ-PG-2, OQ-PG-4, OQ-PG-5

## Deltas owed to the parent definition on completion
- `open-questions.md` → close OQ-T-3; correct its stale `beta.25` → `beta.32`
- `vision-document.md:269` → restate as "…behind the admin gate, which requires a fresh proof of
  parent identity"
- `technical-environment.md` → 8th table, first auth-related persistence; two new deps
  (`@simplewebauthn/*`); `ADMIN_PASSCODE` removed from the env inventory
