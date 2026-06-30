# Application Design (Consolidated)

Consolidates `components.md`, `component-methods.md`, `services.md`, `component-dependency.md` for the Collectible Card Binder for Kids.

## 1. Architecture Overview
- **Frontend + backend**: Next.js (App Router) + TypeScript + Tailwind on Vercel. Server Components for reads, **Server Actions** for mutations.
- **Data**: Postgres (Neon) via **Drizzle ORM**; card images in **Vercel Blob**.
- **Auth**: Auth.js Google provider, parent email allowlist (`PARENT_EMAILS`). After parent login → child profile picker scopes the session.
- **Effects**: custom CSS + pointer/`deviceorientation` (holographic + 3D tilt, rarity-scaled, reduced-motion aware). No animation library.
- **Card pool**: pre-generated offline. Text authored via a claude.ai prompt → seed JSON; images via **Pollinations.ai** (free, no key) → Blob; loaded to DB. Zero per-pull AI cost.

## 2. Components
`AuthGate`, `ProfilePicker`, `PullEngine`, `CardRenderer (+effects)`, `Binder`, `RewardManager`, `AdminPanel`, `CardPool/Seeder`. (Details in `components.md`.)

## 3. Services
`AuthService`, `ProfileService`, `PullService` (core txn), `CollectionService`, `TokenService`, `CardPoolService`, `SeedService` (offline). (Signatures in `component-methods.md`; orchestration in `services.md`.)

## 4. Critical Path — Pull
Atomic DB transaction: verify balance ≥1 → decrement 1 → rarity-weighted `drawCard` → upsert collection (duplicate count++) → return `PullResult` → CardRenderer reveal. Prevents double-spend; rejects at 0 tokens with no spend. (Diagram in `component-dependency.md`.)

## 5. Data Model (high level, finalized in Units Generation)
```
themes:      id, name
cards:       id, theme_id, name, rarity, image_url, edu_text
children:    id, name, avatar
collections: child_id, card_id, count        (unique child_id+card_id)
tokens:      child_id, balance               (>= 0)
```

## 6. Extension Alignment (all enabled)
- **Security**: `requireParent()` on all parent/admin/token actions; allowlist server-side; child scope isolates binders; atomic pull prevents double-spend; only reviewed pool published.
- **PBT**: `drawCard` distribution, pull (decrement-exactly-one, no double-spend), duplicate accounting, theme progress math, token grant/non-negative.
- **Resiliency**: seed retries/fallback on image/storage failure; effects degrade on low-end devices.
- **Accessibility**: image-forward for pre-reader; reduced-motion; responsive.

## 7. Mapping to Units (Workflow Planning)
| Unit | Components / Services |
|---|---|
| U1 Foundation & Data | scaffold, Drizzle schema, Blob, env |
| U2 Auth & Profiles | AuthGate, ProfilePicker, AuthService, ProfileService |
| U3 Pool & Seeding | CardPool/Seeder, SeedService, CardPoolService |
| U4 Pull & Rewards | PullEngine, PullService, TokenService, RewardManager |
| U5 Binder | Binder, CollectionService |
| U6 Card UI & Effects | CardRenderer (+effects) |
| U7 Admin | AdminPanel |

## 8. Open items for next stages
- Final schema details, indexes, and rarity drop-weight values (Units Generation / Functional Design).
- Effect performance budget + reduced-motion specifics (NFR Design).
- Infra wiring: Neon, Blob, Google OAuth credentials, env (Infrastructure Design).
