# Vision Document — Vehicle Themes

- **Scope**: two new card categories — **Flying Machines** and **Ocean Machines**
- **Status**: Business role complete, approved by the user 2026-08-07T09:44:00Z
- **Depth**: quick (7 CORE questions, 3 amendments during the approval loop)
- **Parent definition**: `Product-Definition/vision-document.md` + `technical-environment.md`
  (approved 2026-08-03, Join: done). This document does not rewrite it.
- **Sibling sub-discovery**: `features/collection-safety/` (complete 2026-08-05)
- **Traces to**: **OQ-B-2** in the parent definition — *does the $0/month cost target survive an
  ever-growing card pool?* This is the first deliberate pool growth since that question was raised.

---

## Executive Summary

The card pool has stood at 10 themes × 30 cards = 300 cards since the catalog was last extended. Every
theme is natural history or folklore: animals, dinosaurs, insects, plants, legends, sea creatures,
countries, famous people, superheroes, mythic creatures. The children have seen all of it.

This increment adds two categories — **Flying Machines** (aircraft, balloons, helicopters, rockets,
spacecraft) and **Ocean Machines** (surface vessels, submarines, submersibles) — taking the pool to
**12 themes / 360 cards**. They are the first **man-made** subject matter in the collection, which is
the point: the educational facts shift from biology and myth to engineering and history, a register
the existing ten cannot reach.

The work is data authoring plus a seed run, not application code. The write path is additive and, since
Increment 23, guarded: `upsertTheme` and `insertCardIfNew` are idempotent, and `pnpm seed --sync`
aborts before any write if a prune is pending. Nothing in this increment can destroy a child's cards.

Two decisions carry beyond the two new themes. First, the pull screen shows only the 8 most recent
categories, so adding two pushes **Dinosaurs and Superheroes off the chip row** — accepted deliberately
rather than by oversight. Second, vehicles forced a content-policy question the previous ten themes
never did, and it was resolved **repo-wide**: visible weaponry is now permitted on any subject in any
theme; gore and violence are not.

---

## Business Context

### Problem Statement

The pool is static and finite, and the children have worked through it. Two things follow.

**Freshness.** A collectible-card app's whole loop is *pull → is it new? → where does it go in the
binder*. That loop degrades as the fraction of unseen cards falls. With 300 cards and three children
pulling regularly, most pulls are duplicates, and a duplicate is only interesting as sacrifice fodder.
Adding 60 cards restores a stock of genuinely new cards without changing a line of game logic.

**Breadth.** Every existing theme is something that lives or is imagined — an animal, a plant, a
monster, a hero. There is nothing built by people. A 7-year-old who wants to know how a helicopter
stays up, or what is at the bottom of the ocean and what we sent down to look at it, gets nothing from
the current catalog. Vehicles carry facts about engineering, exploration, and history that the natural
world does not.

Neither problem is urgent, and neither has a deadline. This is a family app; the driver is that the
collection should keep being worth opening.

### Business Drivers

- **Pool freshness** — restore the supply of unseen cards (Q1, option b).
- **Educational breadth** — cover engineering and exploration, absent from all ten existing themes
  (Q1, option c).

No market pressure, no deadline, no external obligation.

### Target Users and Stakeholders

| Role | Description | Primary Need |
|---|---|---|
| Child (early reader, ~7) | Pulls cards, fills the binder, completes rarity sets | New cards to find; subjects they recognise and can ask questions about |
| Parent (admin, sole operator) | Authors the card data, reviews every generated image, runs the seed | A content pipeline that stays free, stays reviewable, and cannot damage the children's existing collections |

### Business Constraints

- **$0/month runtime cost**, inherited from the parent definition and reaffirmed (Q7a-i). Images come
  from Pollinations' anonymous tier; storage stays inside Vercel Blob and Neon free tiers.
- **One-person team.** Authoring 60 cards and eyeballing 60 images is split across multiple sessions
  (Q7b-ii), not forced into one sitting.
- **Kid-safety review is mandatory and human.** The parent definition's *"no unreviewed content path to
  a child, ever"* invariant is untouched by this increment.
- **The rarity pyramid is fixed** at 15 common / 8 rare / 5 epic / 2 legendary per theme. Set-completion
  rewards and the rarity filters depend on every theme having the same shape.

### Success Metrics

**None — by explicit decision (Q1, Amendment 1).**

The user was offered a metric and declined one: *"family app, no need for driver."* The drivers above
are recorded as rationale, not as things anyone will measure. This is a deliberate choice, not an
omission, and it should not be re-derived as a gap by any downstream stage.

One number **is** produced by this increment, but it is a constraint check rather than a success
metric: the **free-tier runway** (Q7c) — current Vercel Blob GB and Neon row count against free-tier
limits, the marginal cost of one theme, and the resulting answer to "how many more themes fit". That
number is the deliverable that feeds **OQ-B-2** in the parent definition.

---

## Full Scope Vision

### Product Vision Statement

The card pool keeps growing along subject lines the children actually ask about, and adding a category
stays a weekend of authoring plus one guarded seed run — never a code change, and never a risk to what
they already own.

### Feature Areas

**1. Flying Machines** — 30 cards. Aircraft, balloons, airships, helicopters, rockets, spacecraft.
Spacecraft are explicitly IN (Q2c): the ISS, Voyager, and Apollo hardware belong here rather than in a
future Space theme, which is excluded (Q6).

**2. Ocean Machines** — 30 cards. Surface vessels, **submarines**, and **submersibles** (Q2c,
Amendment 1). Named "Ocean Machines" to pair with "Flying Machines" and to hold the underwater craft
that "Boats and Ships" would have strained to cover (Amendment 3).

**3. The amended global content rule** — `seed/AUTHORING_PROMPT.md` changes for *every* theme, not
just these two (Amendment 2). See "Content Policy" below.

### Content Policy — the rule that changed

Vehicles are the first theme where the most recognisable subjects are military: the Spitfire, the
SR-71, an aircraft carrier, a submarine. The standing authoring rule — *"Avoid weapons, blood, or
frightening imagery"* — would have excluded all of them and left both themes thinner than the other
ten.

**The rule was changed globally, not scoped to these two themes** (Q3 + Amendments 1 and 2):

| | |
|---|---|
| **Permitted** | Visible weaponry on any subject in any theme — a Spitfire's guns, a carrier's deck, a submarine's torpedo tubes |
| **Prohibited** | **Gore and violence.** Nothing firing, attacking, burning, sinking, or being destroyed. No blood, injury, or casualties. No combat scenes. |
| **Unchanged** | The "non-scary, kid-friendly" instruction still applies in full. Spooky subjects still steer cute or comical. |
| **Unchanged** | `eduText` covers engineering, exploration, or history. Never combat. |
| **Cap** | **At most 2–3 military subjects per theme.** A *military* submarine counts against the cap; a *research* submersible (Alvin, Trieste) does not. |

Two consequences, both accepted:

- **It relaxes the rule for the eight existing themes too**, most visibly Superheroes and Spooky
  Legends. That is what "global" means and it was chosen with that stated.
- **It is forward-looking only.** No existing card is regenerated: the pool is additive and `--sync`
  never re-images an unchanged card. The change affects what future authoring sessions may produce.

The human review pass remains the gate. What moved is the policy the reviewer applies, not whether
review happens.

### What adding two themes does to the existing game

Read out of the code during discovery, and accepted as part of this increment:

| | Effect |
|---|---|
| **Pull-screen chips** | `MAX_PULL_CATEGORIES = 8` and `recentCategories()` show only the 8 newest themes. Animals and Mythic Creatures are already hidden; **Dinosaurs and Superheroes now join them**. All four stay fully collectable via 🎲 Random and every ticket flow — what is lost is the ability to *choose* them. |
| **Draw odds** | `drawCard` picks a rarity by fixed weight, then uniformly within it. Legendaries go 20 → 24, so a specific legendary drops from 1/20 to 1/24 of legendary pulls — **every existing card becomes ~17% rarer** on a Random pull. Near-complete sets take longer to finish. |
| **Set-completion rewards** | A set is one (theme × rarity). Two themes × four rarities = **8 new completable sets per child**, so up to 8 more bonus cards over time, and a longer tail before any child is "done". |
| **Storage** | ~60 × 80 KB ≈ **5 MB** more Vercel Blob; **+60 Neon rows**. Quantified properly by the OQ-B-2 runway measurement. |
| **Seed wall-clock** | 60 images at ~2 concurrent, 3s apart, with retry on 429 ≈ **5–10 minutes**, longer with rate-limit backoff. |

### Future Extensions (not committed)

- A third vehicle theme (Land Vehicles, or Space split out of Flying Machines)
- An admin UI for adding themes, replacing the JSON-file-plus-CLI workflow
- Per-theme rarity tuning
- Quiz questions for the new themes
- Revisiting `MAX_PULL_CATEGORIES` when a 13th theme makes the chip cliff bite again

---

## MVP Scope — Features IN

All eight items from Q5, plus a ninth added by Amendment 2.

| # | Item | Rationale |
|---|---|---|
| 1 | Author 30 cards for **Flying Machines** | 15/8/5/2 pyramid; names, `eduText` (≤120 chars, true, kid-readable), `imagePrompt`, `sourceUrl` |
| 2 | Author 30 cards for **Ocean Machines** | Same shape; surface + submarine + submersible |
| 3 | Cross-theme name-collision check against all 300 existing cards | Card names must be unique across the whole pool, not just within a theme |
| 4 | `sourceUrl` 200-check for all 60 cards | Parenthesised Wikipedia suffixes 404 often enough to be worth automating |
| 5 | `pnpm seed --review` image pass; eyeball all 60 | The only gate between a generated image and a child. Checks kid-safety and the new weapons/gore boundary |
| 6 | `pnpm seed --sync` publish to prod (Blob + Neon) | Additive; `--allow-prune` must NOT be needed, and its being needed is a red flag to stop |
| 7 | Chip-row change | **No-op.** Q4 = accept, so `MAX_PULL_CATEGORIES` stays 8 and no code changes |
| 8 | Measure Blob/Neon usage before and after; report the free-tier runway | Feeds OQ-B-2. The before-figure is only obtainable now |
| 9 | Amend `seed/AUTHORING_PROMPT.md` to state the new global content rule | **Do this first.** That file is what gets pasted into the authoring session, including the one that authors these 60 cards. Until it is edited, every future session receives the old "avoid weapons" instruction |

### Non-Functional Priorities

- **Cost**: strictly $0. Free tiers only, accepting a slow and retry-prone image run.
- **Safety**: zero risk to existing `collections` rows. A prune prompt during `--sync` means stop.
- **Reviewability**: every image seen by a human before publish.
- **Symmetry**: the 15/8/5/2 pyramid holds. Reducing to 20 cards per theme was offered and declined.

---

## MVP Scope — Features OUT

All seven candidates put to the user were excluded (Q6).

| Excluded | Reason | Target Phase |
|---|---|---|
| A third vehicle theme (Land Vehicles / Space) | Spacecraft ride inside Flying Machines instead | Not scheduled |
| An admin UI for adding themes | JSON + CLI is adequate for a one-person, occasional workflow | Not scheduled |
| Per-theme rarity tuning | Breaks the pyramid symmetry that set-completion depends on | Declined |
| A "new category!" announcement in the child UI | Discovery-by-pulling is the intended experience | Not scheduled |
| Retiring an old theme to hold the pool at 10 | Removing a theme cascades into every child's collection — the exact hazard Increment 23 exists to prevent | Declined |
| Quiz questions for the new themes | Separate subsystem; no dependency either way | Not scheduled |
| Raising `MAX_PULL_CATEGORIES` | Consistent with Q4 = accept | Not scheduled |

---

## Risks and Open Questions

### Known Risks

| Risk | Impact | Mitigation |
|---|---|---|
| The children notice Dinosaurs is no longer selectable | Medium | Accepted knowingly (Q4a). Reversible at any time by raising the cap — one constant and one property-test assertion |
| An authoring session run against the un-amended `AUTHORING_PROMPT.md` produces cards under the old rule | Medium | Scope item 9 is sequenced first for exactly this reason |
| The relaxed global rule produces content in *other* themes that the parent would not have approved | Medium | The human review pass is unchanged and still mandatory. The 2–3 military cap is per theme and enforced at review |
| Pollinations' anonymous tier degrades or rate-limits harder across a 60-image run | Low | Bounded retry with Retry-After honoured; failed cards are skipped, not published, and the run is idempotent — re-run picks up where it left off |
| `sourceUrl` rot between authoring and review | Low | Scope item 4 checks all 60 |
| Free-tier boundary crossed sooner than expected | Low | Scope item 8 measures it rather than assuming |
| "Ocean Machines" biases authoring toward salt water, excluding a gondola or paddle steamer | Low | Flagged into the authoring session. The name is a label, not a filter; `Water Machines` remains available as a fallback |

### Open Questions

**None outstanding.** All five pre-declared open questions were raised and resolved inside the
approval loop:

| ID | Question | Resolution |
|---|---|---|
| OQ-VT-1 | No checkable success criterion | Resolved — none wanted; family app |
| OQ-VT-2 | Are submarines in or out? | Resolved — submarines **and** submersibles IN |
| OQ-VT-3 | Military cap left unaffirmed | Resolved — 2–3 per theme; weapons permitted, gore/violence prohibited |
| OQ-VT-4 | Theme name vs. its agreed contents | Resolved — renamed **"Ocean Machines"** |
| OQ-VT-5 | Amended rule contradicts the repo-wide authoring prompt | Resolved — **global** rule change |

One assumption is carried forward rather than resolved, and should be flagged if wrong:
**a military submarine counts against the 2–3 cap; a research submersible does not.**

---

## What Must NOT Change

Inherited from the parent definition and specifically load-bearing for this increment:

- **The children's existing collection data.** This increment is purely additive. If `pnpm seed --sync`
  ever reports a pending prune, that is a defect in the seed file — stop, do not pass `--allow-prune`.
- **`themes.sort_order` is a contract.** The two new themes are **appended** to the `themes` array in
  `seed/cards.json`, taking the highest sort orders. Reordering existing entries reshuffles what the
  children already know. Option (d) in Q4 was declined for this reason.
- **The 15/8/5/2 rarity pyramid, in every theme.** Set-completion rewards and the rarity filters assume
  it. An off-pyramid theme breaks the symmetry permanently.
- **No unreviewed content path to a child, ever.** The content *policy* changed; the *review gate* did
  not. Every one of the 60 images is seen by the parent before publish.
- **`resetPool()` has no override parameter.** Nothing in this increment needs one.
