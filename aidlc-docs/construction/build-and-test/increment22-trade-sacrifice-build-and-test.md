# INCREMENT 22 — Build & Test: Friend-First Trade Board + Galaxy Sacrifice Filter

**Status**: COMPLETE — awaiting approval to proceed to Operations
**Date**: 2026-08-01
**Code summary**: `aidlc-docs/construction/increment22-trade-sacrifice/code/code-summary.md`
**Schema impact**: none — no migration, no seed, no new dependency, no post-deploy step

## 1. Build

| Command | Result |
|---|---|
| `pnpm typecheck` | clean |
| `pnpm test` | **206/206** (182 + 24 new), stable across two consecutive runs |
| `pnpm test:pg` (docker Postgres) | **34 passed / 3 skipped** — includes all 3 new `ownedCardIdsForChildren` contract cases against a real database |
| `pnpm build` | ✅ `/play/trade` 3.57 kB · `/play/binder` 5.61 kB First Load JS |
| Client-bundle secret scan | `AUTH_SECRET` and `ADMIN_PASSCODE` both absent from `.next/static` |

The pg run is what makes the new port method real: the fake passing proves nothing about the SQL.
All three cases — multi-child grouping, absent key for a child holding nothing / empty input,
and agreement with `ownedCardIds` per child — pass on the pg adapter.

## 2. End-to-end data-path check against prod Neon (read-only)

Ran the real `listFriendSummaries`, `getTradeBoard`, `buildColumns`, `binderService.getBinder`,
`sacrificeReady` and `getCardDetail` against production data for all three children. No writes.

```
children: jasper, jax, jazil        SACRIFICE_COST=3  SACRIFICE_MIN=4

jasper  doubles 32   chips: jax 🎁5 | jazil 🎁19
        board vs jax: mine 32 (5 badged) | theirs 28 (3 badged)
        burnable 0    holdings at exactly 3: 11
jax     doubles 28   chips: jasper 🎁3 | jazil 🎁10
        board vs jasper: mine 28 (3 badged) | theirs 32 (5 badged)
        burnable 0    holdings at exactly 3: 6
jazil   doubles 21   chips: jasper 🎁1 | jax 🎁3
        board vs jasper: mine 21 (1 badged) | theirs 32 (19 badged)
        burnable 0    holdings at exactly 3: 3
ALL CHECKS PASSED
```

Assertions that ran and held on real data:
- the friend chip count **equals** the badged count on the board it opens (acceptance criteria 2 + 4);
- badges are exact set-complements in **both** directions, and the two columns are tagged against the
  opposite party (jasper→jax 🎁5 mirrors jax's board showing 5 badged on jasper's side);
- the active child never appears in their own friend strip;
- no card below 4 copies is ever listed, and every listed card's detail page would offer the panel
  (criteria 10 + 11);
- the burn list is a true global — the per-section sums equal the global list exactly (criterion 12).

### ⚠️ Product finding: nobody can currently sacrifice anything

`burnable = 0` for **all three children**, while they hold 11 / 6 / 3 cards at *exactly* 3 copies.
Two consequences worth knowing before deploy:

1. **The correct rule makes the new filter empty today.** Every child will see
   `🔥 Ready to sacrifice 0` and the empty state. That is correct behaviour, not a defect — and it is
   exactly the situation the original prototype got wrong: under the `>= 3` rule it would have listed
   11 cards for jasper, **every one of them a dead end** at the card detail page.
2. **The sacrifice feature itself is currently unreachable** for all three children — this is
   pre-existing (the card detail page has always gated at `> SACRIFICE_COST`), not something this
   increment changed. If sacrificing is meant to be a live part of play, the 4-copy threshold may be
   too high in practice. Changing `SACRIFICE_COST` or the keep-one rule was explicitly out of scope
   here; raising it as a candidate for a future increment.

## 3. Regression surface

| Area | Evidence it is unaffected |
|---|---|
| Trade commit path (`validateTrade`, `swapCards`, `executeTrade`) | untouched; `trade-logic.pbt.test.ts` and `trade-service.test.ts` green |
| Completion-reward cascade | untouched; asserted by the existing `executeTrade` tests |
| Galaxy category + rarity filters | `rarity-filter.pbt.test.ts` untouched and green; `all` mode renders exactly the previous tree |
| Card detail page | gate changed from `count > SACRIFICE_COST` to `count >= SACRIFICE_MIN` — provably the same predicate, asserted by PBT |
| Admin binder preview | shares `ThemeSection`/`CardSlot`, both unchanged |

## 4. Outstanding — visual check (needs a signed-in session)

Not performed here: `/play/*` requires a Google-authenticated parent session, which I can't create.
A dev server is running on **http://localhost:3000**. Worth eyeballing:

1. `/play/trade` — friend chips show `🎁 5` / `🎁 19` style counts before any card is picked.
2. Pick a friend → two columns; only the badged cards carry a label, the rest carry none.
3. Tick "Only show what X is missing" on each column → non-badged cards disappear; counts in the
   label match what's left.
4. Pick a card on one side → mismatched rarities on the other side go dim/grey and stop responding.
5. Phone viewport — columns stack with **your** doubles on top.
6. `/play/binder` — Show row reads `🔥 Ready to sacrifice 0` and opens the empty state (per §2).
   To exercise the populated path, grant a 4th copy of some card to a test child first.

## 5. Deployment

Code-only. `git push` to `main` → Vercel production. **No migration, no seed, no post-deploy step.**
Rollback is a Vercel instant rollback to the previous deployment — nothing persistent changes, so a
rollback is clean.
