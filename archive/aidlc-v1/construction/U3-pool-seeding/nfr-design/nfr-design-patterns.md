# U3 Pool & Seeding — NFR Design Patterns

Maps U3 NFRs to patterns for the offline seed pipeline. No open questions.

## Safety patterns
- **Human review gate**: pipeline supports a two-phase run — `--review` writes images to a local review dir without publishing; a confirmed `--publish` run uploads + inserts (U3-SEC-1).
- **Publish atomicity per card**: a card row is inserted only after its image is in Blob with a valid URL; failures leave no half-card (U3-SEC-2).
- **Secret confinement**: Blob token read only in the script process (U3-SEC-3).

## Resiliency patterns
- **Bounded retry with backoff**: `generateImage` wraps fetch in N retries with growing delay; on exhaustion the card is skipped + recorded, run continues (U3-RES-1).
- **Idempotent upsert / resume**: existence checks (theme name, card name) make re-runs skip done work → safe resume after partial failure (U3-RES-2).
- **Fail-fast validation**: full `seed/cards.json` validated before any write; malformed input aborts with zero side effects (U3-RES-3).

## Performance / cost patterns
- **Batch-once, serve-many**: images generated at seed time, served from Blob/CDN; pull path does zero generation (U3-PERF-1).
- **Concurrency cap**: image generation runs with a small concurrency limit (politeness to the free service + predictable memory).

## Testability patterns
- **Pure validation/prompt**: `loadSeed`, `buildPrompt` pure → unit/property tests.
- **Injected fetch**: `generateImage(prompt, { fetchImpl })` so tests mock network (retry/abort).

## Explicitly NOT used
- No queue/worker infra — a single CLI batch is sufficient for ~36 images.
