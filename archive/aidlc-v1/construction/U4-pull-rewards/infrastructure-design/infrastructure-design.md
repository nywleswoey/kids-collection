# U4 Pull & Rewards — Infrastructure Design

**No new infrastructure.** U4 is pure application logic on the shared stack (Vercel Functions + Neon). No external services, no new env.

## Logical → infra
| Logical (LC) | Where | Service |
|---|---|---|
| LC-P1 PullService | Vercel Function (Server Action) | Neon (conditional UPDATE + ON CONFLICT upsert) |
| LC-P2 TokenService | Vercel Function | Neon |
| LC-P3 Actions | Vercel Function | — |
| LC-P4/P5 UI | Next.js (client + RSC) | — |

## Runtime characteristics
- Each pull/grant = a few SQL statements against Neon from a Vercel Function.
- Correctness via DB statement atomicity (no extra infra).
- Card images already in Blob (U3); U4 only references their URLs.

## Cost / scale
- Trivial query volume (family). No autoscaling/queues. $0 additional.

## No new env
- Reuses `DATABASE_URL`.
