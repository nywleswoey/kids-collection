# Requirements — Collectible Card Binder for Kids

## Intent Analysis
- **User Request**: A web app (deployed to Vercel) where the user's children each maintain a binder of AI-generated collectible cards: pull new cards one at a time, view their collection, with rarity, themes, educational text, and special viewing effects.
- **Request Type**: New Project (greenfield)
- **Scope Estimate**: Multiple Components (auth, card pool + seeding, pull engine, binder UI, card-render with effects, parent admin, storage)
- **Complexity Estimate**: Moderate
- **Requirements Depth**: Standard→Comprehensive

## Users & Personas
- **Parent (admin)**: signs in via Google OAuth; the only authenticated account. Manages children, grants pull tokens (reward system), oversees the card pool.
- **Children (3)**: ages **4, 7, 9**. Not separately authenticated — selected as **profiles** after the parent signs in. Age 4 is a pre-reader → educational text and UI must be simple, large, image-forward.

## Key Decisions (resolved during Requirements Analysis)
| Topic | Decision |
|---|---|
| Auth | Google OAuth (Auth.js/NextAuth), parent email allowlist. After login → child profile picker. |
| Profiles | One parent account → N child profiles. Each child sees **only their own** binder. |
| Card images | **Pre-generated pool** (not live per-pull). Generated once at seed time via a **free, no-API-key, programmatic** image service: **Pollinations.ai** for v1 (Cloudflare Workers AI / Flux noted as a higher-quality alternative if a free account is acceptable). All images **parent-reviewable before going live** (kid-safety). |
| Card text | Educational descriptions + card metadata authored **offline by the user via claude.ai** using a prompt the app project provides, committed as **seed JSON**. No runtime `ANTHROPIC_API_KEY` required. |
| Card pool model | **Shared library**, **separate collections** per child. |
| Duplicates | **Allowed** — shown as `x2`, `x3`, … in the binder. |
| Rarity | **4 tiers**: Common, Rare, Epic, Legendary (drop weights + on-card styling). |
| Pulls | **No daily limit.** Pulls are a **reward currency**: parent grants a child N pull tokens; each pull spends one token. |
| Themes | Claude proposes a starter set. Target vibe: **animals, superheroes, pokemon-like creatures**. |
| Card effects | Holographic foil shimmer, 3D tilt/parallax, rarity-scaled effects, pack-open reveal animation. |
| Devices | Responsive (tablet / phone / desktop). |
| Storage | Vercel Marketplace **Postgres (Neon)** for data + **Vercel Blob** for card images. |
| Stack | **Next.js (App Router) + TypeScript + Tailwind**, deployed to Vercel. |

## Functional Requirements
- **FR1 — Parent auth**: Parent signs in with Google OAuth; access restricted to an allowlisted email set. Unauthed users see only the sign-in screen.
- **FR2 — Child profiles**: After sign-in, show a "Who's playing?" picker of child profiles (name + avatar). Parent can add/edit/remove profiles. Selecting a profile scopes the session to that child.
- **FR3 — Binder view**: A child sees their own collection grouped by **theme**, showing owned cards, duplicate counts (`xN`), and per-theme completion progress (e.g. 7/20). Unowned cards shown as locked/silhouette slots.
- **FR4 — Pull a card (one at a time)**: If the child has ≥1 pull token, spend one and draw a card from the shared pool by rarity-weighted random. Show a **pack-open reveal animation**, then the card with full effects. Duplicates allowed. New cards added to the child's collection; token balance decremented.
- **FR5 — Pull tokens / reward system**: Parent admin can **grant** (and adjust) pull tokens per child. Children cannot grant themselves tokens. Token balance visible to the child. A pull with zero tokens is blocked with a friendly "ask your parent" message.
- **FR6 — Card view & effects**: Each card shows picture, name, rarity (visually reflected on the card), theme, and a short **age-appropriate educational description**. Viewing a card supports: holographic foil shimmer, 3D tilt/parallax (pointer + device orientation), rarity-scaled intensity (legendary > common).
- **FR7 — Card pool & themes**: A seeded library of cards, each with theme, rarity, image, name, educational text. Multiple themes (animals, superheroes, pokemon-like creatures) at launch.
- **FR8 — Parent admin area**: Manage child profiles, grant pull tokens, view all children's collections/stats, and (at minimum) view/curate the card pool and themes.
- **FR9 — Seeding pipeline**: A repeatable, offline process to (a) author card text via a provided claude.ai prompt → seed JSON, (b) generate images programmatically via the free image service from those prompts, (c) upload images to Blob, (d) load cards into the database. Images reviewable before publish.

## Non-Functional Requirements
- **NFR1 — Kid-safety**: All card images and text reviewed before reaching children (enabled by the pre-generated pool). No live, unreviewed AI output shown to kids. No external links or open input surfaces for child profiles.
- **NFR2 — Cost**: Zero per-pull AI cost (pool is pre-generated). Image generation free (no-key service). Text authored manually — no runtime LLM spend.
- **NFR3 — Performance**: Binder and pull interactions feel instant on tablet/phone; images served from Blob/CDN with appropriate sizing; effects must stay smooth (≈60fps target) and degrade gracefully on low-end devices / reduced-motion preference.
- **NFR4 — Usability/Accessibility**: Works for a 4-year-old pre-reader — large touch targets, image-forward, minimal text; honors `prefers-reduced-motion`; responsive across phone/tablet/desktop.
- **NFR5 — Security** *(Security extension ENABLED — blocking)*: Auth-gated; parent allowlist enforced server-side; admin actions (grant tokens, manage profiles) authorized as parent only; secrets in env; no child-side privilege escalation. Detailed rules per `extensions/security/baseline`.
- **NFR6 — Resiliency** *(Resiliency extension ENABLED — directional)*: Graceful handling of image-service/storage failures (fallback/placeholder, retries on seed), observability of pull operations, data integrity on token spend (no double-spend). Per `extensions/resiliency/baseline`.
- **NFR7 — Testability** *(PBT extension ENABLED — blocking)*: Core logic (rarity-weighted draw, token spend/grant, duplicate accounting, collection/progress math) covered by property-based tests. Per `extensions/testing/property-based`.
- **NFR8 — Data persistence**: Children's collections, token balances, profiles, and the card pool persist in Postgres; images in Blob.

## Enabled Extensions
| Extension | Enabled | Enforcement |
|---|---|---|
| Security Baseline | Yes | Blocking |
| Resiliency Baseline | Yes | Directional (design-time) |
| Property-Based Testing | Yes | Blocking |

## Open / Deferred Items (to refine in later stages)
- Exact rarity drop weights and per-theme card counts (Application Design).
- Starter theme list + per-card seed content (proposed in seeding; parent-approved).
- Whether token grants need a history/audit for kids (admin nicety).
- Pollinations.ai vs Cloudflare Workers AI final pick for image quality (Construction/seeding spike).

## Summary
A private, kid-safe, responsive collectible-card web app on Vercel. Parent signs in with Google and grants pull tokens as a reward; each of 3 children collects from a shared, pre-generated, rarity-tiered, themed card pool with picture + educational text and rich holographic/3D/reveal effects. No runtime AI cost: images via a free programmatic service, text authored offline via claude.ai, both seeded into Postgres + Blob. Security and property-based-testing enforced as blocking; resiliency applied as design guidance.
