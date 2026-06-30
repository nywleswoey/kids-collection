# U1 Foundation & Data — NFR Design Patterns

Maps U1 NFR requirements to concrete design patterns. Scale is tiny (single family), so patterns favor correctness + simplicity over scalability machinery.

> No open questions for this stage — NFR requirements were unambiguous and scale is trivial. Patterns derived directly.

## Security patterns (SEC-1..4)
- **Parameterized access**: all queries via Drizzle query builder; no raw interpolation. Satisfies SEC-1.
- **Secret isolation**: `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` read only in server context (`src/lib/env.ts` server-only); never imported into client components. SEC-2.
- **Server-authoritative writes**: balances/counts computed and written server-side in services; client never sends a trusted balance. SEC-4.
- **Least data**: schema stores only child first-name + avatar key. SEC-3.

## Integrity / Resilience patterns (REL-1..3, RES-1)
- **Constraints-as-invariants**: DB enforces unique(childId,cardId), FKs, `CHECK(pullTokens >= 0)`, `CHECK(count >= 1)`. Bad states unrepresentable.
- **Transactional mutation seam**: schema + service API shaped so U4's pull runs in one transaction (read-balance → decrement → upsert). Optimistic single-row update with `WHERE pullTokens >= 1` guards against double-spend even under concurrency.
- **Publish gate**: card rows inserted only with a valid `imageUrl` (RES-1); seed failures don't leave half-cards.
- **Cascade**: `ON DELETE CASCADE` child → collection entries (REL-3).

## Performance patterns (PERF-1)
- **Targeted indexes**: PK indexes; index on `collection(childId)` for binder reads; unique(childId,cardId) doubles as lookup index; index on `card(themeId)` for theme queries. No caching layer needed at this scale.

## Availability (AV-1)
- **Managed-backup reliance**: Neon automated backups; no custom DR. Best-effort.

## Testability (TEST-1..2)
- **Pure-core seam**: `drawCard`, `applyPull`, `grantTokens`, `themeProgress` implemented as pure functions over plain data, DB I/O at the edges → directly property-testable.
- **Versioned migrations**: drizzle-kit migration files committed.

## Explicitly NOT used (and why)
- No queues/caches/circuit-breakers/autoscaling — unjustified at single-family scale; would add complexity without benefit.
