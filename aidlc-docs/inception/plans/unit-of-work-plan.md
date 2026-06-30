# Unit of Work Plan

**Stage**: INCEPTION — Units Generation (Part 1: Planning)
**Sources**: `requirements.md`, `stories.md`, `application-design.md`, `execution-plan.md`

Decompose the system into build units. It's a single private family app, so the natural shape is **one deployable Next.js app with logical feature modules**, built in dependency order. Confirm the few decisions below (defaults recommended), then **/aidlc:approve**.

---

## Proposed units (from Application Design)
| Unit | Scope | Stories |
|---|---|---|
| **U1 Foundation & Data** | Next.js scaffold, Drizzle schema + migrations, Blob + env config | (infra for all) |
| **U2 Auth & Profiles** | Google OAuth + parent allowlist, child profile picker | A1, A2, B1 |
| **U3 Pool & Seeding** | seed JSON, Pollinations.ai image gen → Blob, load to DB | G2, pool source |
| **U4 Pull & Rewards** | rarity-weighted draw, token spend/grant, duplicates | C1–C4, F1, F2 |
| **U5 Binder** | per-child collection, theme grouping, progress | D1, D2 |
| **U6 Card UI & Effects** | CardRenderer: holo/3D/rarity/reveal, reduced-motion | E1, E2, E3 |
| **U7 Admin** | profile mgmt, token grants, oversight | A2, G1 |

Build order (dependencies): **U1 → U2, U3 → U4 → U5, U6 → U7**.

---

## Decomposition Questions

## Question 1 — Deployment model
A) **Single Next.js app** (monolith, logical feature modules) — one Vercel deployment (recommended for a family app)

B) Split into multiple services/deployments

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — Directory structure (greenfield)
A) **Feature-based modules**: `src/features/{auth,profiles,pool,pull,binder,card,admin}`, plus `src/db` (Drizzle schema/queries), `src/lib`, `app/` routes, `scripts/seed` (recommended)

B) Layered: `src/{components,services,db,actions}` by technical layer

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Unit grouping / build order
A) **Keep the 7 units** as listed, built in the dependency order shown (recommended)

B) Merge some (e.g. combine U5 Binder + U6 Card UI into one "Collection UI" unit)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Anything else for decomposition?
Free text (or "none").

[Answer]: none

---

## Artifacts to generate after approval
- [ ] `application-design/unit-of-work.md` — unit definitions, responsibilities, code-org strategy (greenfield)
- [ ] `application-design/unit-of-work-dependency.md` — dependency matrix + build order
- [ ] `application-design/unit-of-work-story-map.md` — stories → units (all stories assigned)
- [ ] Validate boundaries; confirm every story is assigned

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
