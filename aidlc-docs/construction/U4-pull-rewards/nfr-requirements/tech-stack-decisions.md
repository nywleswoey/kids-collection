# U4 Pull & Rewards — Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Atomic spend | **Conditional UPDATE** (`SET pull_tokens = pull_tokens - 1 WHERE id=? AND pull_tokens >= 1 RETURNING`) | Works with neon-http (no interactive txn); single-statement atomic → no double-spend. |
| Duplicate upsert | `INSERT ... ON CONFLICT (child_id, card_id) DO UPDATE SET count = count + 1 RETURNING count` | Single atomic statement; `count` tells duplicate. |
| Draw | U1 pure `drawCard` over `CardPoolService.listCards()` | Reuses tested logic + U3 reader. |
| Mutations | Server Actions (`pullAction`, `grantTokensAction`) | Auth-guarded, CSRF-safe. |
| Validation | Zod / server checks for grant amount | Positive integer; clamp ≥ 0. |

## No new infra / env
- Reuses Neon + existing client. No transactions package needed.

## Notes
- Pool read can be lightly cached per-request; correctness lives entirely in the two atomic statements.
