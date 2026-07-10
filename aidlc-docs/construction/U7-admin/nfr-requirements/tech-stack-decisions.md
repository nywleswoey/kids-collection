# U7 Admin — Tech Stack Decisions

| Concern | Decision | Rationale |
|---|---|---|
| Rendering | Server Components (reads) + client GrantControl | Composition over existing services. |
| Overview counts | Drizzle aggregate (`count`) per child | Cheaper than full `getBinder`. |
| Grant | Reuse U4 `grantTokensAction` | Single source of grant logic. |
| Auth | Reuse U2 `requireParent` | One authz choke point. |

## No new infra / env / deps.
