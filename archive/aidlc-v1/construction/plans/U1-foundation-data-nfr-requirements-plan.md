# U1 Foundation & Data — NFR Requirements Plan

**Unit**: U1 Foundation & Data
Most tech-stack choices were already locked in Inception (Next.js+TS+Tailwind, **Drizzle**, Postgres, **Vercel Blob**, Server Actions). This stage confirms the remaining infra-adjacent NFR choices for the data layer. Defaults recommended — confirm, then **/aidlc:approve**.

## Pre-decided (from requirements.md / application-design.md)
- ORM: Drizzle. Images: Vercel Blob. Server interaction: Server Actions.
- Security + PBT: **blocking**. Resiliency: directional. Accessibility: required (UI units).
- Scale: a single family (≤ ~5 children, hundreds of cards) — tiny.

## Questions

## Question 1 — Postgres provider (Vercel Marketplace)
A) **Neon** (serverless Postgres, generous free tier, great Vercel integration) — recommended

B) Supabase Postgres

C) Other / I'll decide at infra setup

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 2 — Scale & availability assumptions
A) **Private family scale, best-effort availability** — no HA/DR targets, no autoscaling concerns; just don't lose data (recommended)

B) Treat as a small public app (some availability targets)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 3 — Anything else (perf/retention/backup)?
A) **Defaults** — provider's managed backups are enough; no special perf/retention needs (recommended)

B) I have specific needs (describe)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Artifacts to generate after approval
- [x] `U1-foundation-data/nfr-requirements/nfr-requirements.md`
- [x] `U1-foundation-data/nfr-requirements/tech-stack-decisions.md`

---

Fill `[Answer]:` tags, save, then **/aidlc:approve**.
