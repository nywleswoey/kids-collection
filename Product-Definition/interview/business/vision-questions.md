# Business Interview — Sections 5–7 of 7: MVP Scope (OUT) · Risks & Open Questions · Existing System

Progress: `███████▌░░` 15/20 questions  ·  ~6 min remaining

**Final Business batch** — Q16–Q18 plus the two existing-system questions. Sections 5 and 6 hold
3 questions between them, so they're combined with the brownfield pair to make one 5-question batch.
Fill in the [Answer]: tags, then reply **"ready"**.

> Previous batches (Q1–Q15): ✅ saved in `vision-answers-history.md` — nothing is lost.
> This file shows only the active batch.

Tags: `[from: <file>]` · `[from: code]` = read out of the repo just now · `[INFERRED]` = check hardest.

---

## Question 16: What is NOT in the MVP, and why?

Every row here is a scope-creep firewall. Include a target phase if deferred.

[Answer]:

Under the reading (i) you approved, "excluded from MVP" splits into three kinds: shipped-but-not-core,
never-built, and never-ever.

| Excluded Feature | Reason | Target Phase |
|------------------|--------|--------------|
| Quizzes / Learn | Educational depth layered on top of the core loop; the product works without it | Already delivered (post-MVP) |
| Trading | Social layer; only meaningful with 2+ children holding duplicates | Already delivered (post-MVP) |
| Sacrifice | Duplicate sink; only matters once a collection matures | Already delivered (post-MVP) — currently unreachable, see Q17 |
| Easter eggs | Rare-moment delight layered on the pull | Already delivered (post-MVP) |
| Set-completion rewards | Completion incentive on top of the binder | Already delivered (post-MVP) |
| Sound (SFX / BGM / fanfares) | Sensory polish, not load-bearing | Already delivered (post-MVP) |
| Read-aloud / text-to-speech | Named in v1 as "later"; never built | Not committed — see Q13 |
| Token-grant history / audit for kids | Admin nicety | Not committed — see Q13 |
| Higher-quality image generation (Workers AI / Flux) | Needs an account; Pollinations.ai is adequate at $0 | Not committed — see Q13 |
| Multi-family / multi-tenant support | Private family app — one parent, three children, by design | **Never** |
| Public sharing of collections | Would breach the kid-safety rule (no external surfaces) | **Never** — violates NFR1 |

`[from: Q13/Q14 + requirements.md NFR1; the two "Never" rows are INFERRED firewalls I added]`

---

## Question 17: What are the known risks?

[Answer]:

| Risk | Impact | Mitigation |
|------|--------|------------|
| **No backup / restore story for children's collections** | **High** | ⚠️ I could not find one in the repo. Collections are emotionally irreplaceable — a bad migration or a dropped Neon branch loses years of pulls. Confirm whether Neon PITR covers you on the current plan; if not, a periodic `pg_dump` is the cheapest insurance. **Please verify — I'm asserting absence, which is weaker evidence than presence.** |
| Sacrifice is shipped but unreachable — `burnable = 0` for all three children | Medium | `SACRIFICE_MIN = 4` (burn 3, keep 1) is too high for the current collection sizes. Already logged in Increment 22 as "revisit". A live feature nobody can use. |
| Single Google account is a single point of failure | Medium | Parent is the only authenticated user; losing that account makes all three binders inaccessible. No documented recovery path. |
| Pollinations.ai is a free third party with no SLA or account | Medium | Only re-seeding depends on it — the 300 live cards are already in Blob, so children are unaffected if it disappears. Workers AI / Flux is the parked fallback. |
| Age-4 pre-reader can't access the educational text | Medium | One of three users cannot consume the content that justifies the product. Read-aloud is the parked fix. |
| Free-tier limits as the pool grows | Low–Medium | 300 cards today. The $0/month metric (Q10) is the tripwire; watch Neon + Blob usage as themes are added. |
| Increment 22 visual check still outstanding | Low | Checklist in `build-and-test` §4 — never run on a signed-in child profile. |

`[from: aidlc-state.md Increment 22 notes + requirements.md §Open; the backup and single-account risks are INFERRED]`

burnable=0 is because they already burnt their duplicates. But this is tested working. The rest are actual risks.

---

## Question 18: What is still uncertain?

A) I'll write a bulleted list — one question per bullet
B) None — everything above is decided
X) Other

[Answer]:
**A**

- Is there any backup/restore for the Neon database today? (Highest-stakes unknown — see Q17.)
- What should `SACRIFICE_MIN` become so sacrificing is actually reachable, without making duplicates worthless?
- Is read-aloud worth building, or is the age-4 child served well enough by pictures alone?
- Do the 10 themes stay fixed, or does the pool keep growing — and does the $0/month target survive that?
- Does the parent want any visibility into *which* child is pulling what, or is per-child privacy the point?

- Is read-aloud worth building, or is the age-4 child served well enough by pictures alone? pictures alone is sufficient
- pool keeps growing
- no need to know what they are pulling
`[INFERRED — assembled from v1 §Open, the Increment 22 follow-ups, and gaps surfaced during this interview]`

---

## Question B1: Describe the current state in one paragraph.

What does the system do today? Who uses it? What are its major components?

[Answer]:
**Star Catchers** is a private, kid-safe collectible-card web app live on Vercel, used daily by one
parent and three children (4, 7, 9). The parent signs in with Google (email allowlist) and grants
tickets; each child picks their profile and spends tickets to pull rarity-weighted cards from a shared,
pre-generated pool of **300 cards across 10 themes** (uniform 15 common / 8 rare / 5 epic / 2 legendary),
each with an image and an age-appropriate educational fact. Cards land in a per-child binder ("Galaxy")
grouped by theme with duplicate counts and locked silhouettes, and can be viewed with holographic,
3D-tilt and reveal effects. Around that core sit quizzes, kid-to-kid trading, duplicate sacrifice,
easter-egg offers, set-completion rewards and a passcode-gated admin area. It's a Next.js App Router +
TypeScript + Tailwind app on Vercel, with Neon Postgres (Drizzle, migrations 0000–0006 applied to prod)
and Vercel Blob for images; **22 increments shipped between 2026-07-11 and 2026-08-01**, 206 tests green.
`[from: aidlc-state.md, CONTEXT.md, seed/cards.json, src/db/schema.ts — all read directly]`

---

## Question B2: What must NOT change?

List existing components, APIs, schemas, or data that the new work must
leave untouched. This is a hard boundary for AI-DLC.

[Answer]:

**The single most important line in this document** — this is the guardrail AI-DLC will treat as
non-negotiable. Read it hardest.

**1. The children's existing collection data — above all else.**
`collections` rows are the accumulated result of every pull the kids have ever made. They cannot be
reset, re-seeded, or lost to a migration. Any future migration touching `collections`, `children`, or
`cards` needs an explicit data-preservation plan. `[INFERRED — but this is the thing that actually matters]`

**2. Atomicity contracts on the ticket/card economy** `[from: CONTEXT.md + src/db/schema.ts]`
- `count_at_least_one` — `CHECK(count >= 1)` on `collections` (BR9). Duplicates decrement, never to zero-rows.
- `pull_tokens_non_negative`, `easter_egg_tickets_non_negative`, `epic/lucky_tickets_non_negative`.
- `spendOne` returns null on guard failure (no double-spend); `clampedGrant` floors at 0;
  `swapCards` is all-or-nothing. A trade must never half-apply.

**3. Server-authoritative awards via HMAC-signed offers.**
Easter-egg picks and quiz awards are pinned in a signed, expiring offer so a claim cannot be swapped for
an un-offered card. Client-side answer keys exist for *feedback only* — the award stays server-side.
Never move award decisions to the client. `[from: CONTEXT.md; aidlc-state.md Increment 13 FR6]`

**4. `themes.sort_order` is a contract, not a convenience.**
Backfilled in migration 0006 to the exact order the children already saw. Reordering silently reshuffles
their world. `[from: aidlc-state.md Increment 21]`

**5. The auth and safety boundary.**
Parent Google OAuth + email allowlist is the only real boundary. Child profile selection is an httpOnly
cookie convenience, **not** a security boundary — never treat it as one. Admin actions stay behind the
passcode gate. No secret may reach the client bundle (checked every increment).
`[from: CONTEXT.md; requirements.md NFR5]`

**6. Kid-safety: no unreviewed content path to a child, ever.**
Every image and fact is parent-reviewed before going live. No runtime generation into a child-facing
surface. `[from: requirements.md NFR1]`

**7. `SACRIFICE_COST` / `SACRIFICE_MIN` stay a single source of truth.**
`SACRIFICE_COST = 3`, `SACRIFICE_MIN = 4` in `src/features/pull/sacrifice.ts`, consumed by both the card
detail page and the galaxy filter, with a PBT asserting the equivalence. Retuning the *value* is expected
(Q17/Q18) — hardcoding the number anywhere is not. `[from: code + aidlc-state.md Increment 22]`

---

When you're done, reply with a single word: **ready**

(I'll re-read this file from disk and validate your answers.)
