# U7 Admin — Infrastructure Design

**No new infrastructure.** Admin is composition + UI on the shared stack (Vercel Functions + Neon).

| Logical (LC) | Where | Service |
|---|---|---|
| LC-AD1 AdminService | Vercel Function (Server Component reads) | Neon (child list, counts) |
| LC-AD2 Admin UI + GrantControl | Next.js RSC + client | — (grant via U4 action) |

## Runtime
- Dashboard = a few small read queries + reused grant action. No writes beyond grants.
- No new env, external services, or deps.

## Cost / scale
- Trivial. $0 additional.
