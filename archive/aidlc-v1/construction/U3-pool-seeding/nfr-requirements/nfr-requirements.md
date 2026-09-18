# U3 Pool & Seeding — NFR Requirements

Offline seed pipeline. Resiliency (directional) + kid-safety (Security, blocking) dominate. No open questions — approach fixed (Pollinations.ai → Blob → DB).

## Security / Safety `[blocking]`
- **U3-SEC-1** Children only ever see reviewed images (review-before-publish gate; no live unreviewed AI to kids).
- **U3-SEC-2** No card published without complete fields + valid Blob `imageUrl`.
- **U3-SEC-3** `BLOB_READ_WRITE_TOKEN` used only in the offline script (server/CLI), never client.
- **U3-SEC-4** Image prompts constrained to kid-friendly subjects + style; reviewer is the human gate.

## Resiliency `[directional]`
- **U3-RES-1** Image generation retried with bounded backoff; persistent failure → skip card (not published), report it.
- **U3-RES-2** Seed is idempotent — safe to re-run after partial failure; resumes missing cards without duplicating.
- **U3-RES-3** Validation fails fast before any DB/Blob write (bad JSON never partially seeds).

## Performance / Cost
- **U3-PERF-1** Seed is a one-time/occasional batch (~36 images); runtime per-pull cost is zero (pre-generated). Pollinations free, Blob free tier.

## Maintainability / Testability `[PBT]`
- **U3-TEST-1** `loadSeed` validation + `buildPrompt` are pure → unit/property tested; `generateImage` tested with mocked fetch (retry/abort).
- **U3-TEST-2** Seed data (`seed/cards.json`) committed + reviewable in PRs.

## Usability
- **U3-UX-1** Educational text age-appropriate (authored via claude.ai prompt with that instruction).
