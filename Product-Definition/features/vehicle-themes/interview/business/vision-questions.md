# Business Interview (Vehicle Themes) — Batch 1 of 1: all 7 CORE questions

Progress: `░░░░░░░░░░` 0/7 questions  ·  ~8 min

Depth is `quick`, so this is the only Business batch. Fill in the `[Answer]:` tags below, then reply **"ready"**.

> Nothing prior to lose — this is the first batch of a new scoped discovery.
> Answers are saved to `vision-answers-history.md` on validation.

Tags: `[from: code]` = read out of the repo just now · `[INFERRED]` = check this hardest.

---

## Findings first — what "add a category" actually costs here

I read the repo before writing these questions. "Category" = **theme** in the code and DB.

**Today**: 10 themes × 30 cards = 300 cards, every theme a uniform 15 common / 8 rare / 5 epic /
2 legendary `[from: seed/cards.json]`. Order: Animals, Mythic Creatures, Dinosaurs, Superheroes,
Country, Famous People, Weird Insects, Special Plants, Spooky Legends, Deep Sea Creatures.

**Adding 2 themes → 12 themes / 360 cards / 60 new images.** Five consequences worth deciding on:

| # | Consequence | Detail |
|---|---|---|
| **C1** | **Two existing categories fall off the pull screen** | `MAX_PULL_CATEGORIES = 8` and `recentCategories()` shows only the **8 most recent** themes as chips `[from: src/features/pull/categories.ts:14-28, app/play/pull/page.tsx:20]`. Animals and Mythic Creatures are already hidden today. Appending two vehicle themes pushes **Dinosaurs and Superheroes** off the chip row too. Cards stay collectable (🎲 Random and all ticket flows draw from the whole pool) — but the kids lose the ability to *choose* those two. |
| **C2** | **Every existing card gets ~17% rarer on a Random pull** | `drawCard` picks a rarity by fixed weight, then **uniformly within that rarity** `[from: src/lib/logic.ts:24-50]`. Legendaries go 20 → 24, so a specific legendary drops from 1/20 to 1/24 of legendary pulls. Same 300/360 ratio at every tier. Near-complete sets get slower to finish. |
| **C3** | **8 new set-completion sets per child** | A "set" is one (theme × rarity) `[from: src/features/rewards/collection-reward.ts:8]`. 2 themes × 4 rarities = 8 new completable sets → up to 8 more bonus cards per child over time. More reward surface, and a longer tail before any child is "done". |
| **C4** | **The write path is additive and now well-guarded** | `upsertTheme` + `insertCardIfNew` are idempotent; appending to the `themes` array of `seed/cards.json` gives the new themes the highest `sort_order` `[from: src/features/pool/writer.ts:30-74, scripts/seed/index.ts:134]`. `--sync` only prunes what you *remove*, and since Inc23 a pending prune aborts before any write without `--allow-prune`. So pure addition carries **no deletion risk**. |
| **C5** | **Cost is near-zero but this is exactly OQ-B-2** | Images come from Pollinations' anonymous tier — free, but rate-limited, so 60 images run at ~2 concurrent / 3s apart ≈ **5–10 min of wall clock** `[from: src/features/pool/image.ts, scripts/seed/index.ts:50-52]`. Storage: 60 × ~80 KB ≈ **5 MB** more Vercel Blob; +60 Neon rows. The parent definition's **OQ-B-2** asks at what pool size $0/month breaks — this is the first deliberate growth since it was raised. |

**One content note.** Every existing theme is natural-history or folklore, and the authoring rules ban
weapons and frightening imagery `[from: seed/AUTHORING_PROMPT.md]`. Vehicles are the first man-made
theme, and both categories run straight into military hardware (fighter jets, bombers, warships,
submarines). That needs an explicit verdict — see Q3.

---

## Question 1 [CORE]: Why these two, and what does "it worked" look like?

The parent vision has exactly one success metric ($0/month runtime cost), so this feature needs its own.

a) **Kid demand** — one or more of them asked for vehicles; success = they actually pull them.
b) **Pool freshness** — the collection was getting stale; success = renewed engagement, more pulls/week.
c) **Educational breadth** — vehicles cover engineering/history that animals and legends don't.
d) Other

**Recommendation:** state which, and give me the criterion you'd actually check. Realistic options:
"both new categories get chosen from the chip row within the first week", or "each child owns ≥1
vehicle card within N pulls", or honestly — "no metric, I just want them there". The last is a valid
answer for a family app; I'd rather record it than invent a metric you'll never look at.

[Answer]: b and c

---

## Question 2 [CORE]: Exact theme names and card composition

The names go straight into the DB and the chip row, and the rarity pyramid is load-bearing —
set-completion rewards and the rarity filters assume **15 common / 8 rare / 5 epic / 2 legendary**
in every theme `[from: seed/AUTHORING_PROMPT.md]`.

**a) Names.** "Aerial Vehicles" and "Water Vehicles" as written, or shorter/kid-friendlier?
Existing names are 1–3 words, title case: *Animals · Dinosaurs · Weird Insects · Deep Sea Creatures*.
Candidates: `Flying Machines` / `Sky Vehicles` / `Aircraft` — and `Boats and Ships` / `Water Vehicles`
/ `Sea Vessels`.

**Recommendation:** **Flying Machines** and **Boats and Ships**. Both read at a 7-year-old's level,
match the concrete-noun feel of the existing set, and "Flying Machines" comfortably covers hot-air
balloons, helicopters, and rockets — which "Aircraft" does not.

**b) Composition.** Keep the standard 30 / 15-8-5-2 per theme? (Changing it breaks set-completion
symmetry, so I'd treat "yes" as near-mandatory.)

**c) Boundaries.** Does "aerial" include **spacecraft** (rockets, the ISS, Voyager)? Does "water"
include **submarines** (also see Q3) and **submersibles** (Alvin, the Trieste)? These decide whether
you get one theme or eventually three.

[Answer]:Ok with the recommendation. Same composition. Yes include spacecraft and submersibles.

---

## Question 3 [CORE]: Where's the line on military vehicles?

This is the question with no safe default. The authoring rules say *"Avoid weapons, blood, or
frightening imagery"* — but the most recognisable aerial and water vehicles in the world are the
Spitfire, the SR-71, an aircraft carrier, a submarine.

a) **Hard exclude** — nothing built to fight. Civil aviation, cargo ships, ferries, rescue craft,
   research submersibles, historical exploration ships only.
b) **Historic/iconic allowed, unarmed depiction** — a Spitfire or a carrier may appear, but the
   `imagePrompt` never shows weapons firing, and `eduText` is about the engineering or the history,
   never combat.
c) **No restriction beyond the existing "non-scary" rule** — treat them as machines like any other.
d) Other

**Recommendation:** **(b)**, with a cap — at most 2–3 military subjects per theme, all pre-1970 or
clearly non-combat roles (Spitfire, the *Enola Gay* excluded, a rescue helicopter, a carrier shown at
anchor). Rationale: (a) costs you the icons a 7-year-old actually recognises and makes the theme
thinner than the other ten; (c) drifts, because "no restriction" plus 30 cards reliably produces
missiles. A named cap is enforceable at review time, which is where every other content rule in this
project is enforced.

Also state whether **submarines** sit under this rule or are simply excluded from Q2(c).

[Answer]: b

---

## Question 4 [CORE]: Dinosaurs and Superheroes fall off the chip row — is that acceptable?

See C1. `MAX_PULL_CATEGORIES = 8` is asserted by a property test `[from: tests/pull-categories.pbt.test.ts:74]`,
so raising it is a deliberate change, not a tweak.

a) **Accept it** — the cap exists to keep the phone screen readable; newest-8 is the intended
   behaviour and Dinosaurs stays fully collectable via 🎲 Random.
b) **Raise the cap to 10** — keep Dinosaurs and Superheroes selectable; 11 chips on a 390px screen.
c) **Raise the cap and make the row scrollable / two rows** — no theme ever falls off again.
d) **Reorder `seed/cards.json`** so the vehicle themes displace two categories the kids care less
   about, instead of Dinosaurs.
e) Other

**Recommendation:** ask the kids, then default to **(c)** if you can't. (a) is the cheapest and is
what the code intends, but Dinosaurs is the single most likely favourite in that list, and "I can't
pick dinosaurs any more" is a real regression they will notice on day one. (b) just moves the cliff
two themes away. (d) is tempting but **reordering `seed/cards.json` rewrites `themes.sort_order`**,
which the parent vision names as a must-not-change contract — *"Reordering silently reshuffles their
world"* `[from: Product-Definition/vision-document.md:252]`. Do not pick (d) without reading that note.

[Answer]: a

---

## Question 5 [CORE]: What's IN the first slice?

Tick what ships in the first increment. Everything unticked goes to Q6.

- [x] Author 30 cards for theme 1 (names, rarity pyramid, eduText, imagePrompt, sourceUrl)
- [x] Author 30 cards for theme 2
- [x] Cross-theme name-collision check against all 300 existing cards
- [x] `sourceUrl` 200-check for all 60 cards
- [x] `pnpm seed --review` image pass + eyeball all 60 for kid-safety and weapon content
- [x] `pnpm seed --sync` publish to prod (Blob + Neon)
- [x] Whatever Q4 decided about the chip row
- [x] Measure Blob/Neon usage before and after; report the free-tier runway (closes OQ-B-2)

**Recommendation:** all eight. The four verification items are cheap and the review pass is the only
gate standing between a generated image and a child — the parent vision names *"no unreviewed content
path to a child, ever"* as a must-not-change invariant. The OQ-B-2 measurement is two numbers you can
only read cleanly by taking them either side of this exact change; skip it now and you'll never have a
before-figure again.

[Answer]: all 8

---

## Question 6 [CORE]: What's explicitly OUT, and why?

Every row here is a scope-creep firewall. Give a target phase if it's deferred rather than declined.

Candidates worth an explicit verdict: a **third vehicle theme** (Land Vehicles / Space) · **an admin UI
for adding themes** (today it's a JSON file + CLI) · **per-theme rarity tuning** (making vehicles rarer
or commoner than other themes) · **a "new category!" announcement** in the child UI · **retiring an old
theme** to keep the pool at 10 · **quiz questions** for the new themes · **raising
`MAX_PULL_CATEGORIES`** if Q4 didn't already decide it.

[Answer]: All mentioned are excluded.

---

## Question 7 [CORE]: Cost and effort ceiling — and OQ-B-2

The standing product metric is **$0/month runtime cost**, and the parent definition's OQ-B-2 asks
exactly this question: at what pool size does free-tier break?

**a) Money.** (i) Strictly $0 — Pollinations anonymous tier and free Blob/Neon only, even if the image
run takes 10 minutes and some cards need retries. (ii) I'd pay for a keyed image tier to make seeding
fast and reliable. (iii) Other.

**b) Your time.** 60 cards need authored text and 60 images need eyeballing. Is that (i) fine, one
sitting; (ii) fine but split across sessions; (iii) too much — reduce to 20 cards per theme and accept
breaking the pyramid; (iv) other?

**c) OQ-B-2.** Do you want this increment to actually **produce the runway number** (current Blob GB
and Neon rows vs. free-tier limits, plus per-theme cost, extrapolated to "you can add N more themes"),
or is that still a someday item?

**Recommendation:** a(i) · b(ii) · c(**yes, produce the number**). The cost is genuinely near-zero
today — the risk isn't this theme, it's the tenth one after it, and the only cheap moment to measure
is now. On b: 30 authored cards per theme is a real sitting's work, and splitting it is what keeps the
review pass honest. On b(iii) — I'd push back: an off-pyramid theme breaks set-completion symmetry
permanently, which is a much worse trade than taking two evenings.

[Answer]: follow recommendation

---

When all seven are filled in, reply **`ready`**.
