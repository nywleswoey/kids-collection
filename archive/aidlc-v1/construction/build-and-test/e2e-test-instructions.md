# End-to-End Test Instructions

Full user workflow on the deployed app (or `pnpm dev`). Manual for v1; automatable with Playwright (`data-testid`s are in place).

## Prereqs
- Pool seeded (`pnpm seed --publish`).
- Google OAuth redirect URI includes the target origin:
  `https://<domain>/api/auth/callback/google`.

## Happy path
1. Open the site → redirected to `/signin`.
2. Sign in with the parent Google account → profile picker (`profile-picker`).
3. Add a child in `/admin/profiles` (`profile-save-button`); appears in picker.
4. Select the child (`profile-card-{id}`) → home shows 3 tokens.
5. Pull (`pull-button`) → reveal animation → card with rarity styling + effects; balance decrements.
6. Repeat to 0 → `out-of-tokens-message`.
7. Parent `/admin` → `grant-plus5-{id}` → balance +5 → child can pull again.
8. Binder (`binder-page`) → owned cards grouped by theme, progress bars, duplicates `xN`; tap a card → detail with holographic effects.

## Selector reference
Interactive elements expose stable `data-testid`s (see per-unit `frontend-components.md`). Use them for Playwright scripts.

## Accessibility spot-check
- Enable OS "reduce motion" → card effects/reveal become static, still legible.
- Verify large tap targets on phone width; owned vs locked distinguishable without color.
