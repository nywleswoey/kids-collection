# U4 — Frontend Components (Pull & Rewards)

`data-testid` on all interactive elements. Card visuals/effects come from **U6 CardRenderer** (U4 hands it the pulled card).

## PullScreen — `app/play/pull/page.tsx`
- **Server**: requireParent + getActiveChild; if none → /play. Reads balance.
- **Renders**: `TokenBalance`, `PullButton` (or out-of-tokens state), result area.
- `data-testid="pull-screen"`.

## PullButton (client) — `src/features/pull/PullButton.tsx`
- Calls `pullAction` (Server Action). While pending: shows pack-open reveal placeholder (U6 supplies the animation later).
- On result: renders the card via `<Card>` (U6); shows duplicate badge if `isDuplicate`; updates balance.
- Disabled when balance is 0. `data-testid="pull-button"`.

## OutOfTokens (C3)
- When balance 0: button disabled + message "Ask your parent for more pulls 🎟️". `data-testid="out-of-tokens-message"`.

## TokenBalance (F2)
- Shows current balance with an icon. `data-testid="token-balance"`. Updates after each pull/grant.

## RevealResult
- Wraps the pull outcome: reveal animation slot (U6) → `<Card>` → "Pull again" / "Go to binder" actions. Duplicate indicated. `data-testid="pull-result"`.

## GrantTokens (admin, F1) — in `app/admin/profiles` (surfaced by U7)
- Per child: number input + Grant button, plus quick **+1 / +5** buttons → `grantTokensAction`.
- `data-testid="grant-input-{childId}"`, `grant-submit-{childId}`, `grant-plus1-{childId}`, `grant-plus5-{childId}`. Parent-only.

## Server actions — `src/features/pull/actions.ts`
- `pullAction()` → PullService.pull(activeChildId)
- `grantTokensAction(childId, n)` → TokenService.grant (requireParent)

## Accessibility
- Pull button large + central (pre-reader). Reveal honors reduced-motion (U6). Duplicate shown with icon + text.
