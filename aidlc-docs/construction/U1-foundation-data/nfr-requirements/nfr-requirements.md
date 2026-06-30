# U1 Foundation & Data — NFR Requirements

Scope: the data layer (schema, persistence, core invariants). Scale = single family (best-effort availability).

## Security `[blocking]`
- **SEC-1** All DB access parameterized via Drizzle (no string-concatenated SQL) — injection-safe.
- **SEC-2** DB connection string + Blob token in env/secrets only; never in client bundle or repo.
- **SEC-3** No secrets or PII beyond child first-name + avatar key; no sensitive child data stored.
- **SEC-4** Token-balance and collection writes only via server (Server Actions/services), never client-trusted values.

## Data Integrity / Reliability
- **REL-1** Enforce invariants in schema where possible: unique (childId, cardId); FKs (card→theme, entry→child/card); `pullTokens ≥ 0` and `count ≥ 1` (check constraints).
- **REL-2** Pull mutation atomic (transaction) — enforced in U4, schema must support it.
- **REL-3** Cascade delete child → collection entries.

## Performance
- **PERF-1** Trivial scale (hundreds of cards, single-digit children). Index FKs + (childId) for collection reads; (childId, cardId) unique covers lookups. No further tuning needed.

## Availability / DR
- **AV-1** Best-effort; rely on Neon managed backups. No HA/RTO/RPO targets.

## Maintainability / Testability `[PBT blocking]`
- **TEST-1** Pure logic (drawCard, applyPull, grantTokens, themeProgress) separable for property-based tests.
- **TEST-2** Schema + migrations versioned (Drizzle migrations in repo).

## Accessibility
- N/A for U1 (no UI). Applies to UI units (U5/U6).

## Resiliency `[directional]`
- **RES-1** Image/storage failures handled at seed (U3); data layer stays consistent (don't insert card rows with missing imageUrl at publish).
