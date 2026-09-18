# Application Design Plan

**Stage**: INCEPTION — Application Design (Planning)
**Sources**: `requirements.md`, `stories.md`, `execution-plan.md`

A few technical-shape decisions before I produce the design docs. Each has a recommended default — confirm or change, then **/aidlc:approve**.

---

## Proposed shape (defaults)
- **App**: Next.js (App Router) + TypeScript + Tailwind on Vercel.
- **Components (high level)**: `AuthGate`, `ProfilePicker`, `PullEngine`, `CardRenderer` (+ effects), `Binder`, `RewardManager`, `AdminPanel`, `CardPool/Seeder`.
- **Services**: `AuthService`, `ProfileService`, `PullService`, `CollectionService`, `TokenService`, `CardPoolService`, `SeedService`.
- **Data**: Postgres (Neon) via ORM; images in Vercel Blob.

---

## Design Questions

## Question 1 — Data access / ORM
A) **Drizzle ORM** — lightweight, type-safe, SQL-first, great for Vercel + property-based testing (recommended)

B) **Prisma** — popular, batteries-included, heavier

C) Raw SQL / `postgres.js` only

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — Server interaction style
A) **Next.js Server Actions** for mutations (pull, grant tokens, manage profiles) + Server Components for reads (recommended; least boilerplate)

B) **REST API routes** (`/api/*`) for everything (more explicit, more code)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Card effects implementation
A) **Custom CSS + pointer/device-orientation** (holographic gradient + 3D tilt via CSS transforms; dependency-light, full perf control, easy reduced-motion) — recommended

B) **Animation library** (e.g. Framer Motion) for tilt/reveal + CSS for holo

C) Adapt an existing holographic-card technique (Pokémon-cards-CSS style)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4 — Image generation service (confirm)
Requirements decided "free, no-key, programmatic." Confirm the pick:

A) **Pollinations.ai** — free, no API key, simple HTTP image URL; I generate the pool once and you review before publish (recommended for zero setup)

B) **Cloudflare Workers AI** (Flux) — higher quality, free tier, but needs a free Cloudflare account + token

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 5 — Anything else for the design?
Free text (or "none").

[Answer]: none

---

## Artifacts to generate after approval
- [x] `application-design/components.md` — components, responsibilities, interfaces
- [x] `application-design/component-methods.md` — method signatures + I/O (business rules later in Functional Design)
- [x] `application-design/services.md` — services + orchestration
- [x] `application-design/component-dependency.md` — dependency matrix + data flow
- [x] `application-design/application-design.md` — consolidated doc
- [x] Validate completeness/consistency

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
