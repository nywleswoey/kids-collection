# PostHog post-wizard report

The wizard has completed a deep integration of your project. The kids-collection app already had a solid PostHog foundation (SDK init, reverse proxy, server client, user identification, and exception capture). This run supplemented that with two new events covering the last meaningful gaps: set-completion rewards and the trade funnel entry point. Environment variables were written to `.env.local`.

## Events instrumented

| Event name | Description | File |
|---|---|---|
| `card_pulled` | A child discovers a card using any ticket type (normal, epic, lucky, or rarity-pick). | `src/features/pull/PullButton.tsx` |
| `card_sacrificed` | A child sacrifices 3 copies of a card for a rarity-pick ticket. | `src/features/pull/SacrificePanel.tsx` |
| `easter_egg_picked` | A child picks a card from the easter-egg lucky-star picker. | `src/features/pull/EasterEggPicker.tsx` |
| `quiz_started` | A child begins a quiz for a topic. | `src/features/quiz/QuizFlow.tsx` |
| `quiz_completed` | A child submits quiz answers; includes pass/fail and score. | `src/features/quiz/QuizFlow.tsx` |
| `trade_initiated` | A child picks their card to trade — top of the trade funnel. *(new)* | `src/features/trade/TradeFlow.tsx` |
| `trade_completed` | A child successfully completes a card trade with a friend. | `src/features/trade/TradeFlow.tsx` |
| `collection_reward_shown` | A child earns a set-completion bonus card after collecting every card of a rarity in a theme. *(new)* | `src/features/rewards/CollectionRewardModal.tsx` |
| `tokens_granted` | A parent grants normal pull tokens to a child. | `src/features/pull/actions.ts` |
| `special_ticket_granted` | A parent grants an epic or lucky special ticket to a child. | `src/features/pull/actions.ts` |
| `rarity_pick_granted` | A parent grants a rarity-pick ticket to a child. | `src/features/pull/actions.ts` |
| `profile_selected` | A parent selects a child profile to enter play mode. | `src/features/profiles/actions.ts` |
| `profile_created` | A parent creates a new child profile. | `src/features/profiles/actions.ts` |
| `profile_removed` | A parent removes a child profile. | `src/features/profiles/actions.ts` |
| `admin_unlocked` | A parent successfully unlocks the admin dashboard with the passcode. | `src/features/admin/unlock-action.ts` |

## Next steps

We've built a dashboard and five insights for you to monitor key user behaviour:

- **Dashboard** — [Analytics basics (wizard)](https://us.posthog.com/project/525202/dashboard/1898999)
- **Card pulls by ticket type** — [View insight](https://us.posthog.com/project/525202/insights/L4lg5Xg1)
- **Trade funnel: initiated → completed** — [View insight](https://us.posthog.com/project/525202/insights/9AUeeXdt)
- **Quiz funnel: started → passed** — [View insight](https://us.posthog.com/project/525202/insights/LkUcdybV)
- **Collection rewards earned** — [View insight](https://us.posthog.com/project/525202/insights/1aKqjUDm)
- **Tokens granted by parents** — [View insight](https://us.posthog.com/project/525202/insights/DxenOEPO)

## Verify before merging

- [ ] Run a full production build (`pnpm build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite (`pnpm test`) — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — the current `PostHogIdentitySync` component in `app/layout.tsx` runs `posthog.identify` on every render where the parent session is present, which correctly covers returning visitors.
- [ ] This project contains a PostgreSQL data source (`@neondatabase/serverless`). Run `npx @posthog/wizard warehouse` to connect it to PostHog's data warehouse.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
