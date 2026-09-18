# Units of Work

**Deployment model**: Single Next.js app (monolith, logical feature modules), one Vercel deployment.
**Decomposition**: 7 build units, developed in dependency order. Each unit = a logical module + its stories, built and tested before the next depends on it.

## Code Organization Strategy (Greenfield)
```
kids-collection/
├── app/                          # Next.js App Router (routes, layouts, server components)
│   ├── (auth)/                   # sign-in
│   ├── play/                     # profile picker → child experience
│   │   ├── pull/                 # pull screen
│   │   └── binder/               # collection
│   └── admin/                    # parent admin (gated)
├── src/
│   ├── features/
│   │   ├── auth/                 # AuthGate, AuthService, allowlist
│   │   ├── profiles/             # ProfilePicker, ProfileService
│   │   ├── pool/                 # CardPoolService
│   │   ├── pull/                 # PullEngine, PullService (txn), TokenService, RewardManager
│   │   ├── binder/               # Binder, CollectionService
│   │   ├── card/                 # CardRenderer + effects (CSS)
│   │   └── admin/                # AdminPanel
│   ├── db/                       # Drizzle schema, migrations, query helpers
│   └── lib/                      # shared utils (rng, auth helpers, env)
├── scripts/
│   └── seed/                     # SeedService: JSON → Pollinations.ai → Blob → DB
└── tests/                        # property-based + integration tests
```
- Server Actions colocated in each feature (`actions.ts`); reads via Server Components calling services.
- All DB access through `src/db` via Drizzle; no client-side DB.

## Unit Definitions

### U1 — Foundation & Data
- **Scope**: Next.js+TS+Tailwind scaffold; Drizzle schema (themes, cards, children, collections, tokens) + migrations; Blob + env config; base layout.
- **Deliverable**: app boots, DB schema migrated, env wired.
- **Depends on**: —

### U2 — Auth & Profiles
- **Scope**: Auth.js Google provider + parent allowlist; sign-in; child profile CRUD + picker; active-profile session scoping.
- **Stories**: A1, A2, B1.
- **Depends on**: U1.

### U3 — Card Pool & Seeding
- **Scope**: seed JSON schema; SeedService (Pollinations.ai image gen → Blob → DB); CardPoolService reads; review-before-publish.
- **Stories**: G2, pool source for C1.
- **Depends on**: U1.

### U4 — Pull Engine & Rewards
- **Scope**: rarity-weighted `drawCard`; atomic `pull` (verify/decrement/draw/upsert); TokenService grant/adjust; RewardManager; zero-token + duplicate handling.
- **Stories**: C1, C2, C3, C4, F1, F2.
- **Depends on**: U1, U2, U3.

### U5 — Binder & Collection
- **Scope**: per-child collection grouped by theme; owned vs locked slots; duplicate counts; theme progress; card detail open.
- **Stories**: D1, D2.
- **Depends on**: U1, U2, U4 (collection data).

### U6 — Card UI & Effects
- **Scope**: CardRenderer — rarity frame, holographic shimmer + 3D tilt (pointer/device-orientation), rarity-scaled intensity, pack-open reveal, reduced-motion + low-end degradation; responsive.
- **Stories**: E1, E2, E3 (+ used by C2 reveal, D1 detail).
- **Depends on**: U1 (card data shape); integrates with U4/U5.

### U7 — Admin
- **Scope**: AdminPanel — profile mgmt, token grants, view all collections/balances, pool overview; parent-gated.
- **Stories**: A2 (admin side), G1.
- **Depends on**: U2, U4, U5, U3.

## Build Order
**U1 → {U2, U3} → U4 → {U5, U6} → U7**
