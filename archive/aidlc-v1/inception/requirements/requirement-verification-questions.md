# Requirements Clarification Questions

Project: **Collectible Card Binder for Kids** (greenfield, deployed to Vercel)

Fill in each `[Answer]:` tag (pick a letter, or use **X) Other** and describe). Answer in this file, then tell me to continue. Defaults are noted where I have a recommendation.

---

## Section A — Users & Access

## Question 1
How do your children sign in / pick who they are?

A) No real login — a simple "Who's playing?" profile-picker screen listing each child (simplest; fine for a private family app)

B) Shared device PIN per child (each child taps their name + 4-digit PIN)

C) Real accounts with email/password (heavier; needed only if used outside the home)

X) Other (please describe after [Answer]: tag below)

[Answer]: X. Sign in using my account, then let them select the "profile"

## Question 2
How many children will use it, and roughly what ages? (ages affect reading level of the educational text and UI complexity)

[Answer]:3. Age 4,7,9

## Question 3
Should one child be able to see another child's binder?

A) No — each child only sees their own binder (recommended)

B) Yes — read-only peek at siblings' binders

C) Yes — full shared family collection

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 4
Do you (parent) need an admin view — e.g. add/curate themes, see all collections, control pulls/limits?

A) Yes — a simple parent/admin area

B) No — not needed for v1

X) Other (please describe after [Answer]: tag below)

[Answer]: A. In fact, I should grant the number of cards they can pull. I'll use it as a reward system.

---

## Section B — Card Generation (AI)

## Question 5
**Biggest decision.** When are card images generated? AI image generation costs money and takes several seconds per image.

A) **Pre-generated pool** — you/the app generate a fixed library of cards ahead of time; a "pull" draws randomly from that existing pool (fast, cheap at pull-time, predictable cost, images can be quality-checked before kids see them) — **recommended**

B) **Live generation** — every pull calls an AI image model in real time to create a brand-new unique card (most "magical", but slow per pull, ongoing cost per pull, and unpredictable/unsafe output risk for kids)

C) Hybrid — mostly pre-generated, occasional live "special" generation

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 6
Which AI generation are you picturing — just the **picture**, just the **text/description**, or both? And do you have a provider/budget preference (e.g. OpenAI, Google Gemini/Imagen, Vercel AI Gateway, a budget cap per month)?

[Answer]: Just use my claude subscription.

## Question 7
When a child pulls a card that already exists in the pool, what happens?

A) They can get duplicates (duplicates shown as "x2"; common in real collectible card games)

B) No duplicates — a child only ever pulls cards they don't already own, until a theme is complete

C) Duplicates allowed but convertible (e.g. trade duplicates toward a guaranteed rare)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 8
Is the card pool **shared** across all children (everyone draws from the same library) or **separate per child**?

A) Shared library, separate collections (each kid collects from the same set of possible cards) — recommended

B) Fully separate pools per child

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section C — Rarity, Themes & Pulls

## Question 9
What rarity tiers do you want? (rarity sets drop odds + on-card styling)

A) 4 tiers: Common, Rare, Epic, Legendary (recommended)

B) 3 tiers: Common, Rare, Legendary

C) 5 tiers: Common, Uncommon, Rare, Epic, Legendary

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 10
Are pulls unlimited, or rate-limited? (kids + unlimited pulls can mean instant 100% completion or runaway AI cost)

A) Limited — e.g. N free pulls per day per child (you set N)

B) Earned — pulls earned by doing something (chores, reading, a parent-granted token)

C) Unlimited

X) Other (please describe after [Answer]: tag below)

[Answer]:

If you picked A or B, how many per day / how are they earned?

[Answer]: X. I will award the number of pulls as a reward system.

## Question 11
Themes (superheroes, monsters, animals, …) — who defines them and how many at launch?

A) I'll give you a starter list of themes now and you build a pool around them

B) You (Claude) propose a sensible starter set of themes + sample cards

C) Themes are parent-managed via the admin area at runtime

X) Other (please describe after [Answer]: tag below)

[Answer]: B

If you have specific themes in mind, list them here:

[Answer]: Animals, superheroes, anything similar to pokemon

---

## Section D — Experience & "Special Effects"

## Question 12
The "special effects when viewing a card" — what feel are you after? (multi-select OK)

A) Holographic / foil shimmer that follows device tilt or mouse (classic shiny-card look)

B) 3D tilt / parallax as you move the card

C) Rarity-based effects (legendary glows/animates more than common)

D) Reveal animation when a new card is pulled (pack-opening suspense)

X) Other (please describe after [Answer]: tag below)

[Answer]: A, B, C, D

## Question 13
Primary device(s)?

A) Tablet (touch) — e.g. iPad

B) Phone

C) Desktop/laptop browser

D) Mix of the above (responsive)

X) Other (please describe after [Answer]: tag below)

[Answer]: D

---

## Section E — Storage & Hosting

## Question 14
Data needs to persist (each child's collection, the card pool). Storage preference on Vercel?

A) You choose the simplest good option (likely a Vercel Marketplace Postgres e.g. Neon, plus Blob for images) — recommended

B) I have a database/account already (tell me which)

C) Keep it ultra-simple / no real backend if possible

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question 15
Tech stack — any preference, or use the Vercel-native default?

A) Vercel-native default: Next.js (App Router) + TypeScript + Tailwind — recommended

B) I have a preference (describe)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section F — Extensions (AI-DLC opt-in)

## Question: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question: Resiliency Extensions
Should the resiliency baseline be applied to this project?

Enabling it applies directional, design-time best practices (AWS Well-Architected Reliability Pillar) toward fault tolerance, availability, observability, recoverability. It is a starting point, not a production-readiness guarantee.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more) — likely fine for a private family app

X) Other (please describe after [Answer]: tag below)

[Answer]: A

## Question: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips

C) No — skip all PBT rules (suitable for simple CRUD/UI projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

When done, save this file and reply (e.g. **/aidlc:approve** or "answers ready"). I'll analyze for any follow-ups, then write the requirements document.
