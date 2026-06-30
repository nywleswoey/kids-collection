# Unit of Work — Story Map

Every story from `stories.md` assigned to a unit. (A2 spans Auth setup + Admin; primary owner Admin, profile-create surfaced in U2.)

## By Unit
### U1 — Foundation & Data
- (no user stories) — enabling infra: schema, env, Blob, scaffold. Supports all.

### U2 — Auth & Profiles
- **A1** Sign in with Google `[SEC]`
- **A2** Manage child profiles (create/edit/remove) `[SEC]` — shared with U7
- **B1** Pick who's playing

### U3 — Card Pool & Seeding
- **G2** Pool seeded & safe `[SEC][resiliency]`
- (provides pool consumed by C1)

### U4 — Pull Engine & Rewards
- **C1** Pull a card (one at a time) `[PBT][SEC]`
- **C2** Pack-open reveal *(reveal visuals via U6)*
- **C3** Out of tokens
- **C4** Duplicate handling `[PBT]`
- **F1** Grant pull tokens `[SEC][PBT]`
- **F2** Child sees token balance

### U5 — Binder & Collection
- **D1** View my binder *(card detail render via U6)*
- **D2** Theme completion progress `[PBT]`

### U6 — Card UI & Effects
- **E1** Rarity reflected on the card
- **E2** Interactive effects (holo/3D/rarity-scaled) `[a11y][resiliency]`
- **E3** Age-appropriate educational text `[a11y]`

### U7 — Admin
- **A2** Manage child profiles `[SEC]` — primary owner
- **G1** View all collections & balances `[SEC]`

## Coverage Check
| Epic | Stories | Assigned |
|---|---|---|
| A Auth/Setup | A1, A2 | U2, U7 ✓ |
| B Profile Select | B1 | U2 ✓ |
| C Pulling | C1–C4 | U4 (+U6 visuals) ✓ |
| D Binder | D1, D2 | U5 (+U6 render) ✓ |
| E Card View/Effects | E1–E3 | U6 ✓ |
| F Rewards | F1, F2 | U4 ✓ |
| G Admin/Pool | G1, G2 | U7, U3 ✓ |

**All stories assigned. No orphans.**

## Cross-unit integration touchpoints
- **C2 reveal** & **D1 card detail** render through **U6 CardRenderer**.
- **A2** create-profile UI appears in both onboarding (U2) and admin (U7); single ProfileService backs both.
