# Services

Service layer = server-side orchestration behind Server Actions / Server Components. All write paths go through services (never direct DB from UI). Authorization enforced in services.

## AuthService
- **Responsibility**: Session + parent allowlist enforcement.
- **Orchestration**: Wraps Auth.js (Google). `requireParent()` guards every parent/admin action. Allowlist from env (`PARENT_EMAILS`).

## ProfileService
- **Responsibility**: Child profile lifecycle + active-profile scoping.
- **Orchestration**: Parent-only mutations (`requireParent`). `setActiveProfile` writes active child to session/cookie; downstream reads scope by it. `removeChild` cascades to collection rows.

## PullService  ⭐ core
- **Responsibility**: The pull transaction.
- **Orchestration**: Single DB transaction — lock/read balance, reject if 0, decrement, `drawCard()` (rarity-weighted), upsert collection row (increment count), commit. Returns `PullResult`. Atomicity prevents double-spend. Calls CardPoolService for the active pool; CollectionService shares the upsert.
- **Extensions**: `[SEC]` child-scope only; `[PBT]` draw distribution, decrement-exactly-one, no-double-spend.

## CollectionService
- **Responsibility**: Read models for binder + admin; progress math.
- **Orchestration**: Aggregates owned cards by theme; computes M/N progress; serves card detail. Read-only.
- **Extensions**: `[PBT]` progress math (distinct owned ≤ total; complete iff owned==total).

## TokenService
- **Responsibility**: Token grants/adjustments + balance.
- **Orchestration**: Parent-only grant/adjust (`requireParent`); enforces balance ≥ 0; shares balance read with PullService.
- **Extensions**: `[SEC]` parent-only; `[PBT]` grant adds exactly n, balance never negative.

## CardPoolService
- **Responsibility**: Serve the shared pool + themes to the app.
- **Orchestration**: Read-only pool/theme queries; provides the candidate set + rarity weights to PullService.

## SeedService (offline / build-time)
- **Responsibility**: Build the pool.
- **Orchestration**: Reads seed JSON → for each card, generate image (Pollinations.ai) → upload (Blob) → insert theme+card. Idempotent (skip existing). Review-before-publish gate. Run via script, not at runtime — keeps per-pull cost zero.
- **Extensions**: `[resiliency]` retry/fallback on image/storage failure; `[SEC]` only reviewed content published.

## Orchestration flows
- **Pull**: PullEngine → `PullService.pull` → (CardPoolService draw + Collection upsert + Token decrement) → CardRenderer reveal.
- **Grant**: AdminPanel → `TokenService.grantTokens` (requireParent) → balance.
- **Binder**: Binder (Server Component) → `CollectionService.getCollection` + `getThemeProgress`.
- **Seed**: script → `SeedService.seedPool` → Blob + DB.
