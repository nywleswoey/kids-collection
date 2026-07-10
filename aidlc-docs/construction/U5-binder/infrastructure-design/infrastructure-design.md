# U5 Binder & Collection — Infrastructure Design

**No new infrastructure.** Read-only UI on the shared stack (Vercel Functions + Neon + Blob images).

## Logical → infra
| Logical (LC) | Where | Service |
|---|---|---|
| LC-B1 CollectionService | Vercel Function (Server Component reads) | Neon (pool + collection queries) |
| LC-B2 Binder UI | Next.js RSC + client detail | Blob (card images via `next/image`) |

## Runtime
- Binder page = 2 reads (pool + child collection) merged in memory.
- No writes, no external calls, no new env.

## Cost / scale
- Trivial. Images from Blob CDN. $0 additional.
