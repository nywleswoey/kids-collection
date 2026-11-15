# `src/features/` - domain features

One folder per feature. A feature may import `src/shared/`, `src/db/`, `src/lib/`
and other features. `src/shared/` must never import from here.

## Shape of a feature folder

| File | Role |
|---|---|
| `*service.ts` | The logic: `makeXService(deps)` factory over store ports. Pure enough to test with the `.fake.ts` stores. |
| `*service.prod.ts` | Binds that factory to the Postgres adapters, once. Pages and actions import this. |
| `actions.ts` | `"use server"` actions called from client components. Return `src/lib/actions.ts`'s result shape. |
| `*.tsx` | Client components for this feature's screens. |
| other `*.ts` | Pure helpers with their own tests in `tests/`. |

## Features

| Feature | Owns |
|---|---|
| `pull` | Spending a token to draw a card (single and 5/10 packs), easter-egg offers, sacrifice, the pull screen. Entry: `pull-service.ts`. |
| `binder` | A child's collection by theme, the category hub, franchise grouping, card order, burn pile. Entry: `service.ts`. |
| `trade` | Two-sided duplicate swap between children, the swap board tiers. Entry: `trade-service.ts`. |
| `rewards` | Set-completion bonuses and the `RewardGranter` port that `pull` calls. Entry: `service.ts`. |
| `quiz` | Daily learn topics, generated maths/fraction questions, grammar bank, awarding tickets. Entry: `quiz-service.ts`. |
| `profiles` | Child profiles: create, edit, archive, restore, the active-profile cookie. Entry: `service.ts`. |
| `admin` | Parent dashboard: token grants, previews, the passcode and passkey gate (`webauthn/`). Entry: `service.ts`. |
| `auth` | Google sign-in allowlist, route guards, fresh-auth checks. |
| `activity` | Per-child activity log merged from six tables. Entry: `activity-service.ts`. |

## Testing

Unit tests for a feature live in `tests/<feature-or-file>.test.ts` and build
the service with the `.fake.ts` stores. Anything that touches real SQL shape
(chained CTEs, ON CONFLICT) gets a `tests-pg/*.pg.test.ts` as well.
