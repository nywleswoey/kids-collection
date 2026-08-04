# Business Interview — Answers History

Append-only durable record of every validated batch (questions + answers, caveats verbatim).
NEVER rewritten or truncated. The active-batch buffer `vision-questions.md` may be overwritten
freely because confirmed answers already live here.

---

## Section 1: Executive Summary — Q1–Q5
**Validated**: 2026-08-03T04:36:37Z
**Depth**: full · **Pre-fill**: enabled (v1 `aidlc-docs/`) · **Interaction**: batch

### Q1 [CORE] — Project name and type
**Answer**: **C** — A significant addition to an existing product.
Name: **Star Catchers** (repo `kids-collection`).
*Source tag retained by user*: `[from: aidlc-state.md — "Star Catchers rebrand" landed in Increment 3; repo/package name is still kids-collection]`

### Q2 [CORE] — Target users (one-liner)
**Answer**: Three children in one family — originally ages 4, 7 and 9 — who collect, view and trade
AI-generated cards, with their parent as the sole authenticated account and the person who grants the
pull tokens that drive the whole reward loop.
*Source tag retained by user*: `[from: requirements.md §Users & Personas; personas.md P0–P3]`
**Caveat (carried, unresolved)**: ages recorded as "originally" 4/7/9 from project start; current ages
not confirmed. Flagged for `open-questions.md` — drives the pre-reader → confident-reader design axis.

### Q3 [CORE] — Core capability
**Answer**: Turns a parent-granted token into a rarity-weighted card pull from a pre-generated,
kid-safe pool, and gives each child a persistent personal binder to grow, complete and trade from.
*Source tag retained by user*: `[from: requirements.md §Summary + FR3/FR4/FR5]`

### Q4 [CORE] — Business problem
**Answer**: **X** — Neither a business nor a compliance problem. It's a *parenting* problem: making
screen time earnable and educational. The parent wants a reward lever with real pull for the kids,
that teaches something, that is guaranteed safe to look at, and that costs ~nothing to run.
*Source tag retained by user*: `[INFERRED from: personas.md P0 Goals/Motivations — "educational reward lever; low cost; low maintenance"]`
**Note**: X-tagged answer → feeds `shared/open-questions-collector.md` per interview validation guidance.

### Q5 [CORE] — Measurable outcome
**Answer** (user-edited — narrowed my three candidates to one and closed the question):
Keep runtime AI cost at **$0/month** while the pool grows (v1's real, met constraint).
**"I don't need other metrics."** — user verbatim.
**Validation**: passes the Q5 number-and-direction rule ($0/month, held flat under pool growth).
**Recorded as**: single success metric for the product. User explicitly declined additional metrics —
do not re-propose engagement/completion metrics in later sections.

---

**Section 1 Complete** — 2026-08-03T04:36:37Z · 5/20 questions answered.

---

## AMENDMENT — Q2 (Section 1)
**Applied**: 2026-08-03T04:40:04Z
**User Input**: "the ages are current"
**Trigger**: Approval-loop change request against the Q2 caveat.

### Q2 [CORE] — Target users (one-liner) — AMENDED
**Answer (supersedes the Section 1 Q2 answer above)**:
Three children in one family — **currently ages 4, 7 and 9** — who collect, view and trade
AI-generated cards, with their parent as the sole authenticated account and the person who grants the
pull tokens that drive the whole reward loop.

**Caveat status**: **RESOLVED.** The earlier caveat ("ages recorded as 'originally' 4/7/9; current ages
not confirmed") is withdrawn. Ages 4/7/9 are current as of 2026-08-03 and confirmed by the user.
**Do NOT** carry this to `open-questions.md`.

**Correction to my own reasoning**: the staleness flag was unfounded. The increment log spans
2026-07-11 → 2026-08-01 — roughly three weeks, not a period over which ages would drift.

**Design consequence (unchanged from v1, now confirmed)**: the pre-reader → early-reader →
confident-reader axis holds exactly as `personas.md` P1/P2/P3 describe it —
P1 (4) pre-reader: image-forward, large tap targets, minimal text, read-aloud a future option;
P2 (7) early reader: short facts; P3 (9) confident reader: full educational text, notices unfairness
in odds/duplicate handling.

---

## Section 2: Business Context — Q6–Q10
**Validated**: 2026-08-03T07:19:44Z
**User edits**: none — batch accepted verbatim as pre-filled.

### Q6 — Problem statement in concrete terms
**Answer**: Screen time was a bargaining chip with no structure behind it: the parent had nothing to
trade against that the kids actually wanted, and the things they did want (games, videos) taught them
nothing and cost money or attention to police. The parent also can't hand three young children an open
AI tool — anything generated has to be reviewed before a 4-year-old sees it, and no commercial kids'
collectible app gives that guarantee while also being free to run.

Concretely, what hurt: (a) no reward currency the parent controlled, (b) no way to make that reward
educational, (c) unreviewed AI output is unacceptable for this age group, (d) per-pull AI image/text
generation would cost real money at kid-scale pull rates.

**Provenance caveat (important)**: this answer is an AI reconstruction, accepted verbatim by the user
rather than authored by them. v1 has no prose problem statement — `requirements.md` opens directly into
solution decisions. Synthesised from `personas.md` P0 Goals/Motivations/Pains + `requirements.md`
NFR1 (kid-safety) and NFR2 (cost). Treat as lower-confidence than user-authored content; the user was
explicitly told it was a reconstruction and chose to accept it.

### Q7 — Business drivers / why now
**Answer**: **X** — No external driver and no hard date. Personal project for the parent's own three
children, started ~2026-07-11 and shipped continuously since (22 increments in ~3 weeks). The "why now"
is that the kids are at the ages where a collecting loop lands — the 4-year-old at the picture-driven
stage, the 9-year-old at the completion/optimisation stage.
**Note**: X-tagged → feeds the open-questions collector. No hard dates to record.

### Q8 [CORE] — Target users and stakeholders

| Role | Description | Primary Need |
|------|-------------|--------------|
| Parent (admin) | Account owner; only authenticated user (Google OAuth, email allowlist). Manages profiles, grants tokens, curates the pool, holds the admin passcode gate. | A reward lever they fully control, with a hard guarantee that nothing unreviewed reaches a child — and near-zero running cost and upkeep. |
| Child — pre-reader (age 4) | Youngest. Cannot read fluently. Tablet, touch. | Image-forward UI with large tap targets and minimal text; the surprise of a pull and visibly "shiny" rares. Can't consume written educational text yet. |
| Child — early reader (age 7) | Middle. Reads simple text. Tablet or phone. | Short readable facts, fast feedback, visible completion progress; chasing rares. Short attention for long text. |
| Child — confident reader (age 9) | Oldest. Reads comfortably. Any device. | Theme completion, pull optimisation, full educational text, showing off legendaries. Will notice unfair odds or wrong duplicate handling — the collection must feel "real". |

**Source**: `personas.md` P0–P3 incl. the Persona → Feature relevance matrix. Ages confirmed current
2026-08-03 per the Q2 amendment.
**Validation**: no empty "Primary Need" cells — passes the Q8 rule.

### Q9 — Business constraints
**Answer**: **A + D.**

- **A — Budget cap: effectively $0 recurring.** No runtime AI spend (pool pre-generated; card text
  authored offline via claude.ai, so no `ANTHROPIC_API_KEY` at runtime), free no-API-key image
  generation (Pollinations.ai), free-tier hosting/storage (Vercel + Neon Postgres + Vercel Blob).
- **D — Kid-safety policy, inviolable, not a preference.** Every image and every line of text is
  parent-reviewed before it can reach a child; no live unreviewed AI output; no external links or open
  input surfaces on any child-facing screen.
- **Also in force as hard engineering policy** (v1 "enabled extensions"): Security Baseline and
  Property-Based Testing are **blocking**; Resiliency is **directional**.
- **Not C**: no external regulation applies — private family app, no third-party data.

**Source**: `requirements.md` §Key Decisions, NFR1, NFR2, §Enabled Extensions.
**Cross-role note**: A and D are business-side statements of what the Technical interview must capture
as deny-list constraints. Check for contradiction at the join.

### Q10 [CORE] — Success metrics

| Metric | Current State | Target State | Measurement Method |
|--------|---------------|--------------|--------------------|
| Runtime AI cost | $0/month | $0/month, held flat as the card pool grows | Absence of any runtime LLM/image API call in the deployed app + Vercel/Neon/Blob billing staying within free tier |

**Validation**: Target State and Measurement Method both non-empty — passes the Q10 rule.
**Single row by design** per the user's Q5 declaration ("I don't need other metrics"). Completion and
engagement metrics were deliberately NOT re-proposed. Do not reintroduce them downstream.

---

**Section 2 Complete** — 2026-08-03T07:19:44Z · 10/20 questions answered.

---

## Sections 3–4: Full Scope Vision · MVP Scope (IN) — Q11–Q15
**Validated**: 2026-08-03T08:29:31Z
**User edits**: none — batch accepted verbatim as pre-filled.
**Batching note**: Section 3 holds only 3 questions, so it was combined with Section 4 to keep the
batch within the mandated 5–7 range.

### Q11 — Product vision statement
**Answer**: Every card a child in this family opens is a small, safe moment of delight that also
teaches them something true — and the collection they build is theirs, permanent, and worth showing off.
**Provenance caveat**: AI-synthesised, accepted verbatim. v1 has no vision statement anywhere; derived
from the educational + kid-safe + "collection must feel real" threads in `requirements.md` and
`personas.md` P3. Lower confidence than user-authored content.

### Q12 — Feature areas
**Answer** (grounded in the repo, not the increment log — 14 modules under `src/features/`, 16 routes):

- **Auth & profiles** — Google OAuth (parent only, email allowlist) → child picker; profile choice is a
  cookie convenience, NOT a security boundary.
- **Pull engine** — token-spent, rarity-weighted draw from the shared pool; category chips
  (🎲 Random + 8 newest themes); may branch into an easter-egg offer.
- **Ticket economy** — `pullTokens`, special egg tickets (✨ epic / 🍀 lucky), per-rarity pick tickets.
  The single currency the reward loop runs on.
- **Binder / Galaxy** — per-child collection by theme, `xN` duplicates, locked silhouettes, rarity +
  category filters, per-theme completion.
- **Card rendering & effects** — holographic foil, 3D tilt/parallax, rarity-scaled intensity, pack-open
  reveal, roulette.
- **Sound** — SFX + BGM, rarity fanfares, dedicated easter-egg cue.
- **Easter eggs** — ~1% pick-1-of-N epic+ offers, HMAC-signed and expiring.
- **Quizzes / Learn** — educational questions with per-question feedback; award server-authoritative
  via signed offer.
- **Trading** — atomic two-sided duplicate swap; friend-first board badging only what the other lacks.
- **Sacrifice** — burn 4+ copies (keep 1) for a rarity-pick ticket, same tier or one up, 50/50.
- **Set-completion rewards** — bonus card per (child, theme, rarity) set completed, cascading.
- **Admin** — passcode-gated (20s sliding TTL): profiles, grant all ticket types, view any binder,
  preview/curate pool.
- **Seeding pipeline** — offline: claude.ai prompt → `seed/cards.json` → programmatic images → Blob →
  Postgres. Parent-reviewable before live.

**Current pool** `[from: seed/cards.json, parsed 2026-08-03]`: **10 themes × 30 cards = 300**, each
theme a uniform 15 common / 8 rare / 5 epic / 2 legendary.

### Q13 — Future extensions considered but NOT committed
**Answer**: **A** — bulleted list:

- **Read-aloud / text-to-speech** for the age-4 pre-reader — `personas.md` P1 says "possibly read-aloud
  later"; never built. Means one of the three users cannot access the educational text that justifies
  the product.
- **Token-grant history / audit for kids** — "admin nicety", deferred.
- **Higher-quality image generation** — Cloudflare Workers AI / Flux over Pollinations.ai; parked
  because it needs an account.
- **Re-tuning the sacrifice threshold** — Increment 22 shipped 4-copy eligibility, then found
  `burnable = 0` for all three children; sacrificing is currently unreachable by anyone. Logged as
  "revisit in a future increment".

### Q14 [CORE] — MVP features (IN)
**Interpretation applied**: reading **(i) MVP = the shipped baseline that defines the product**.
The alternative — (ii) MVP = next-milestone scope — was offered explicitly in the buffer with a
one-line switch ("use reading (ii)"). The user did not switch and then approved, confirming (i).
Consequence: `vision-document.md` is **descriptive of the product as it stands**, not a forward plan.

| Feature | Rationale | Primary User Type |
|---------|-----------|-------------------|
| Parent Google sign-in + email allowlist | Only auth boundary in the system; everything else sits behind it | Parent |
| Child profile picker | Scopes every collection and ticket balance to one child | All |
| Pull a card (rarity-weighted, token-spent) | The core loop — the product is nothing without it | Children |
| Pull tokens granted by parent | The reward lever; the entire reason the app exists | Parent |
| Binder / Galaxy collection view | Where the collection becomes visible and worth growing | Children |
| Card view + effects (holo, 3D tilt, reveal) | The delight that makes a pull feel like a pull | Children |
| Educational text per card | The justification for the screen time | Children (7, 9) |
| Pre-generated, parent-reviewed pool | The kid-safety guarantee — non-negotiable | Parent |
| Admin: manage profiles, grant tickets | Without it the parent can't operate the reward loop | Parent |
| Seeding pipeline | How the pool exists at all, at $0 runtime cost | Parent |

**Validation**: 10 rows — under the ~12 threshold that would flag an over-large MVP.
**Held OUT of MVP despite being shipped** (feeds Q16): quizzes, trading, sacrifice, easter eggs,
set-completion rewards, sound. Test applied: the product is still the product without them.

### Q15 — Non-functional priorities for MVP
**Answer**: **D + E + X.**

- **D — Security/data protection**, specific shape = *kid-safety*: nothing unreviewed reaches a child;
  no child-side privilege escalation (a child must not grant themselves tickets). Security Baseline is
  a **blocking** extension in v1.
- **E — Cost efficiency** — the $0/month runtime target from Q5/Q10.
- **X — Usability for a 4-year-old pre-reader** — a harder constraint here than latency or scale:
  large touch targets, image-forward, minimal text, honours `prefers-reduced-motion`.

**Explicitly NOT top-3, with reasoning**: **B scalability** irrelevant at 3 users, one family;
**C uptime** has no target worth stating (nobody is paged); **A latency** demoted to a feel requirement
("effects stay smooth ~60fps, degrade gracefully on low-end devices"), not an SLO.
**Cross-role note**: D, E and X are the three the Technical interview must carry as concrete NFRs;
B and C should be recorded there as explicit non-goals so nobody designs for scale that isn't needed.

---

**Section 3 Complete** — 2026-08-03T08:29:31Z
**Section 4 Complete** — 2026-08-03T08:29:31Z · 15/20 questions answered.

---

## Sections 5–7: MVP Scope (OUT) · Risks & Open Questions · Existing System — Q16–Q18, QB1–QB2
**Validated**: 2026-08-03T08:50:26Z
**User edits**: TWO substantive corrections (Q17 sacrifice risk withdrawn; Q18 three questions answered
inline). Q16, QB1, QB2 accepted as pre-filled. Corrections propagated below.

### Q16 — Features deliberately excluded from MVP
**Answer** (two rows revised after the user's Q17/Q18 corrections):

| Excluded Feature | Reason | Target Phase |
|------------------|--------|--------------|
| Quizzes / Learn | Educational depth layered on the core loop; product works without it | Already delivered (post-MVP) |
| Trading | Social layer; only meaningful with 2+ children holding duplicates | Already delivered (post-MVP) |
| Sacrifice | Duplicate sink; only matters once a collection matures | Already delivered (post-MVP) — working as designed |
| Easter eggs | Rare-moment delight layered on the pull | Already delivered (post-MVP) |
| Set-completion rewards | Completion incentive on top of the binder | Already delivered (post-MVP) |
| Sound (SFX / BGM / fanfares) | Sensory polish, not load-bearing | Already delivered (post-MVP) |
| **Read-aloud / text-to-speech** | **Parent's judgement: pictures alone are sufficient for the age-4 child** | **Declined — not planned** |
| Token-grant history / audit for kids | Admin nicety | Not committed |
| Higher-quality image generation (Workers AI / Flux) | Needs an account; Pollinations.ai is adequate at $0 | Not committed |
| Multi-family / multi-tenant support | Private family app — one parent, three children, by design | **Never** |
| Public sharing of collections | Would breach the kid-safety rule (no external surfaces) | **Never** — violates NFR1 |

**Revisions vs. the pre-fill**: the Sacrifice row no longer says "currently unreachable"; the read-aloud
row moved from "Not committed" to **Declined** per the user's Q18 answer.

### Q17 — Known risks
**Answer** (6 rows — the sacrifice row was WITHDRAWN by the user):

| Risk | Impact | Mitigation |
|------|--------|------------|
| **No backup / restore story for children's collections** | **High** | Not found in the repo. Collections are irreplaceable — a bad migration or dropped Neon branch loses every pull the kids have made. Confirm whether Neon PITR covers the current plan; otherwise a periodic `pg_dump`. **Unverified assertion of absence — see Q18.** |
| Single Google account is a single point of failure | Medium | Parent is the only authenticated user; losing that account makes all three binders inaccessible. No documented recovery path. |
| Pollinations.ai is a free third party with no SLA or account | Medium | Only re-seeding depends on it — the 300 live cards are already in Blob, so children are unaffected if it disappears. Workers AI / Flux is the parked fallback. |
| Age-4 pre-reader can't access the educational text | Medium | **Accepted risk.** Parent's judgement is that pictures alone suffice for the 4-year-old; read-aloud explicitly declined (Q18). Retained as a known, deliberate trade-off — not an open action. |
| Free-tier limits as the pool grows | Low–Medium | **Raised in significance** by the Q18 decision that the pool keeps growing. 300 cards today. The $0/month metric (Q10) is the tripwire; watch Neon rows + Blob storage. |
| Increment 22 visual check still outstanding | Low | Checklist in `build-and-test` §4 — never run on a signed-in child profile. |

**WITHDRAWN — user correction, verbatim**: *"burnable=0 is because they already burnt their duplicates.
But this is tested working. The rest are actual risks."*
The pre-filled risk "Sacrifice is shipped but unreachable" was **wrong and is removed**. `burnable = 0`
is the expected steady state after the children spend their duplicates, not a defect. `SACRIFICE_MIN = 4`
needs no retuning. This corrects an AI misreading of the Increment 22 follow-up note in `aidlc-state.md`,
which was repeated several times earlier in this interview.

### Q18 — Open questions
**Answer**: **A** — with three of five resolved inline by the user.

**REMAINS OPEN** (carries to `open-questions.md`):
- **Is there any backup/restore for the Neon database today?** Highest-stakes unknown in the product.
- **Does the $0/month target survive an ever-growing pool?** Newly sharpened: the user decided the pool
  keeps growing (below) while Q10 fixes the success metric at $0/month held flat. These two positions
  are in tension at some pool size; the crossover point is unknown. *(Derived during this interview —
  not a v1 item.)*

**RESOLVED by the user — do NOT carry to `open-questions.md`**:
- ~~Is read-aloud worth building?~~ → **"pictures alone is sufficient"**. Read-aloud declined.
- ~~Do the 10 themes stay fixed, or does the pool keep growing?~~ → **"pool keeps growing"**. Decided.
- ~~Does the parent want visibility into which child is pulling what?~~ → **"no need to know what they
  are pulling"**. No parent-facing per-child pull telemetry needed.

**WITHDRAWN** (moot after the Q17 correction):
- ~~What should `SACRIFICE_MIN` become?~~ → the current value works as designed.

### QB1 [CORE] — Current state
**Answer**: **Star Catchers** is a private, kid-safe collectible-card web app live on Vercel, used daily
by one parent and three children (4, 7, 9). The parent signs in with Google (email allowlist) and grants
tickets; each child picks their profile and spends tickets to pull rarity-weighted cards from a shared,
pre-generated pool of **300 cards across 10 themes** (uniform 15 common / 8 rare / 5 epic / 2 legendary),
each with an image and an age-appropriate educational fact. Cards land in a per-child binder ("Galaxy")
grouped by theme with duplicate counts and locked silhouettes, viewable with holographic, 3D-tilt and
reveal effects. Around that core sit quizzes, kid-to-kid trading, duplicate sacrifice, easter-egg offers,
set-completion rewards and a passcode-gated admin area. Next.js App Router + TypeScript + Tailwind on
Vercel, Neon Postgres (Drizzle, migrations 0000–0006 applied to prod), Vercel Blob for images;
**22 increments shipped 2026-07-11 → 2026-08-01**, 206 tests green.
**Source**: `aidlc-state.md`, `CONTEXT.md`, `seed/cards.json`, `src/db/schema.ts` — all read directly.

### QB2 [CORE] — What must NOT change  ⚠️ HARD BOUNDARY FOR AI-DLC

**1. The children's existing collection data — above all else.**
`collections` rows are the accumulated result of every pull the kids have ever made. They cannot be
reset, re-seeded, or lost to a migration. Any future migration touching `collections`, `children`, or
`cards` needs an explicit data-preservation plan.

**2. Atomicity contracts on the ticket/card economy.**
- `count_at_least_one` — `CHECK(count >= 1)` on `collections` (BR9). Duplicates decrement, never to zero-rows.
- `pull_tokens_non_negative`, `easter_egg_tickets_non_negative`, `epic/lucky_tickets_non_negative`.
- `spendOne` returns null on guard failure (no double-spend); `clampedGrant` floors at 0;
  `swapCards` is all-or-nothing. A trade must never half-apply.

**3. Server-authoritative awards via HMAC-signed offers.**
Easter-egg picks and quiz awards are pinned in a signed, expiring offer so a claim cannot be swapped for
an un-offered card. Client-side answer keys exist for *feedback only*. Never move award decisions to the client.

**4. `themes.sort_order` is a contract, not a convenience.**
Backfilled in migration 0006 to the exact order the children already saw. Reordering reshuffles their world.

**5. The auth and safety boundary.**
Parent Google OAuth + email allowlist is the only real boundary. Child profile selection is an httpOnly
cookie convenience, **not** a security boundary — never treat it as one. Admin actions stay behind the
passcode gate. No secret may reach the client bundle.

**6. Kid-safety: no unreviewed content path to a child, ever.**
Every image and fact is parent-reviewed before going live. No runtime generation into a child-facing surface.

**7. `SACRIFICE_COST` / `SACRIFICE_MIN` stay a single source of truth.**
`SACRIFICE_COST = 3`, `SACRIFICE_MIN = 4` in `src/features/pull/sacrifice.ts`, consumed by both the card
detail page and the galaxy filter, with a PBT asserting the equivalence. **Revised**: the values are
correct as-is (per the Q17 correction) — no retune expected. The invariant is that the constants stay a
single source of truth and are never hardcoded elsewhere.

**Source**: `CONTEXT.md`, `src/db/schema.ts`, `src/db/migrations/0000–0006`,
`src/features/pull/sacrifice.ts`, `requirements.md` NFR1/NFR5.

---

**Section 5 Complete** · **Section 6 Complete** · **Existing System Complete** — 2026-08-03T08:50:26Z
**BUSINESS INTERVIEW COMPLETE — 20/20 questions answered.**

---

## AMENDMENT — Q13 (Section 3), consequent on the Q17/Q18 corrections
**Applied**: 2026-08-03T08:50:26Z
**Trigger**: User corrections in the final batch invalidate two bullets of the already-approved Q13.

### Q13 — Future extensions considered but NOT committed — AMENDED
Two of the four bullets recorded in Section 3 are superseded:

- ~~**Read-aloud / text-to-speech**~~ → **DECLINED, not merely uncommitted.** User: *"pictures alone is
  sufficient"*. Move from "considered but not committed" to a settled no. The Section 3 framing that
  called it "the clearest unserved user need in the product" is **withdrawn** — that was an AI judgement,
  now overruled by the parent's.
- ~~**Re-tuning the sacrifice threshold**~~ → **WITHDRAWN.** User: *"burnable=0 is because they already
  burnt their duplicates. But this is tested working."* Not a deferred capability; nothing to revisit.

**Unchanged and still uncommitted**: token-grant history / audit for kids; higher-quality image
generation (Workers AI / Flux).

**Root cause of both errors**: I read the Increment 22 follow-up note in `aidlc-state.md`
("burnable = 0 for all 3 children today — sacrificing is currently unreachable") as a defect report,
when it describes the expected steady state after the children spend duplicates. That misreading was
repeated in Q13, Q16 and Q17 before the user corrected it.

---
