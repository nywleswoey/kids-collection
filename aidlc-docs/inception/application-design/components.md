# Components

High-level functional components and responsibilities. Detailed business rules deferred to Functional Design (per-unit, Construction).

## Stack decisions
- Next.js (App Router) + TypeScript + Tailwind, Vercel.
- **Drizzle ORM** over Postgres (Neon). **Server Actions** for mutations, Server Components for reads.
- **Vercel Blob** for card images. **Auth.js** with Google provider (parent allowlist).
- Card effects: **custom CSS + pointer/device-orientation** (no animation lib).
- Image generation (seed-time): **Pollinations.ai** (free, no key).

## C1 — AuthGate
- **Purpose**: Gate the app behind Google sign-in; enforce parent allowlist.
- **Responsibilities**: Render sign-in; resolve session; block non-allowlisted emails; expose current parent identity.
- **Interfaces**: server session helpers (`requireParent()`), sign-in/out UI.

## C2 — ProfilePicker
- **Purpose**: After parent auth, choose which child is playing.
- **Responsibilities**: List child profiles (name+avatar, large tap targets); set active child in session scope.
- **Interfaces**: profile list (read), `selectProfile(childId)`.

## C3 — PullEngine
- **Purpose**: Drive a single card pull and reveal.
- **Responsibilities**: Check token balance; trigger draw; play pack-open reveal; show resulting card; handle zero-token state.
- **Interfaces**: `pull()` action; reveal/animation UI; duplicate indication.

## C4 — CardRenderer (+ Effects)
- **Purpose**: Render a card with picture, name, rarity styling, educational text, and interactive effects.
- **Responsibilities**: Rarity-based frame/styling; holographic shimmer + 3D tilt from pointer/device orientation; rarity-scaled intensity; reduced-motion + low-end graceful degradation; image-forward layout for pre-readers.
- **Interfaces**: `<Card card rarity interactive />`.

## C5 — Binder
- **Purpose**: Show a child's own collection grouped by theme.
- **Responsibilities**: Theme grouping; owned vs locked/silhouette slots; duplicate counts (xN); per-theme progress (M/N); open card detail.
- **Interfaces**: collection view (read), card detail open.

## C6 — RewardManager
- **Purpose**: Parent grants/adjusts pull tokens; child views balance.
- **Responsibilities**: Grant/adjust tokens (parent only); show child balance; enforce non-negative balance.
- **Interfaces**: `grantTokens(childId, n)` (parent), balance display (child).

## C7 — AdminPanel
- **Purpose**: Parent-only oversight + management.
- **Responsibilities**: CRUD child profiles; grant tokens; view each child's collection + balances; access pool overview.
- **Interfaces**: parent-gated admin routes; calls Profile/Token/Collection services.

## C8 — CardPool / Seeder
- **Purpose**: Define and populate the shared card library (offline/seed-time).
- **Responsibilities**: Load card seed data (text authored via claude.ai prompt → JSON); generate images via Pollinations.ai; upload to Blob; insert cards/themes into DB; support parent review before publish.
- **Interfaces**: seed script (`pnpm seed`), pool read API for the app.

## Component → Story coverage
| Component | Stories |
|---|---|
| AuthGate | A1 |
| ProfilePicker | B1 |
| PullEngine | C1, C2, C3, C4 |
| CardRenderer | E1, E2, E3, D1(detail) |
| Binder | D1, D2 |
| RewardManager | F1, F2 |
| AdminPanel | A2, G1 |
| CardPool/Seeder | G2, C1(pool source) |
