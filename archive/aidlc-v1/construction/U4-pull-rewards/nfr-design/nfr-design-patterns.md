# U4 Pull & Rewards — NFR Design Patterns

No open questions. Patterns target correctness-under-concurrency at family scale.

## Correctness patterns
- **Compare-and-swap spend**: the `WHERE pull_tokens >= 1` UPDATE is an optimistic CAS — the DB row is the single arbiter; no app-level locking needed, no double-spend (U4-SEC-1).
- **Atomic upsert**: `ON CONFLICT … count+1` makes duplicate accounting a single statement (U4-BR4) — no read-modify-write race.
- **Side-effect ordering**: pure draw is computed only after the spend succeeds; out-of-tokens short-circuits before any write (U4-REL-2).
- **Compensating action**: best-effort refund if the post-spend upsert fails (saga-style compensation; U4-REL-1).

## Authorization patterns
- **Reuse U2 gateway**: `requireParent()` on grant; active-child cookie resolves pull subject (U4-SEC-2/3). No new authz surface.

## Performance patterns
- **Per-request pool cache**: `listCards()` result reused within a request; no caching layer (small pool).
- **Minimal round-trips**: pull = 3 statements; grant = 1.

## Testability patterns
- **Pure core reused**: draw/spend/grant property-tested in U1.
- **Concurrency test**: fire N parallel pulls at a child with K tokens → exactly K succeed, balance ends at 0, never negative.

## Explicitly NOT used
- No distributed locks / queues — the conditional UPDATE is sufficient.
