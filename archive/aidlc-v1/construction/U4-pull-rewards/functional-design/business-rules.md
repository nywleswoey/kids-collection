# U4 — Business Rules (Pull & Rewards)

`[SEC]` security, `[PBT]` property-tested.

## Pull (C1, C2, C4)
- **U4-BR1** `[SEC][PBT]` A pull spends exactly one token via the conditional atomic UPDATE; if balance < 1, no token is spent and no card is drawn (C3).
- **U4-BR2** `[SEC]` No double-spend: concurrent/rapid pulls can never take a token the child doesn't have, nor spend one token twice.
- **U4-BR3** `[PBT]` Drawn card is rarity-weighted from the eligible pool (U1 BR1/BR2).
- **U4-BR4** `[PBT]` A pulled card is added to the child's collection; duplicates increment `count` (U1 BR8/BR9). `isDuplicate` true iff already owned.
- **U4-BR5** The pull is initiated only for the **active child** (U2 cookie); a child pulls only into their own collection. `[SEC]`
- **U4-BR6** On collection-write failure after spend, attempt token refund; log on refund failure (no silent loss beyond rare edge).

## Rewards (F1, F2)
- **U4-BR7** `[SEC]` Granting/adjusting tokens is **parent-only** (`requireParent`).
- **U4-BR8** `[PBT]` Grant of N adds exactly N; balance never goes negative (clamped ≥ 0) (U1 BR5).
- **U4-BR9** Child cannot grant themselves tokens; only pull (spend) (U1 BR7).
- **U4-BR10** Token balance is visible to the child (F2) and reflects spends/grants accurately.

## Out of tokens (C3)
- **U4-BR11** With 0 tokens, the Pull control is disabled and a friendly "Ask your parent for more pulls" message shows; tapping does nothing.
