# Increment 4 — Admin Gate, Preview & Content: Clarification Questions

**Type**: Enhancement + Content + Security (brownfield)
**Intent (your request)**: (1) admin passcode; (2) admin full-binder preview with buttons to trigger effects/animations; (3) replace Superheroes category with Dinosaurs; (4) every card has a *true* fun fact with a source link shown in admin for fact-checking.

Answer each after its `[Answer]:` tag. Recommended default listed first where I have one.

---

## Q1 — Admin passcode: mechanism
How should the admin passcode work? (Currently admin is gated only by parent Google sign-in.)

A) **Single shared passcode in an env var** (e.g. `ADMIN_PASSCODE`), compared server-side; simplest, no schema change

B) **Per-parent PIN stored hashed in the DB**, set on first use (more work, supports multiple parents)

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q2 — Admin passcode: scope + session
What does the passcode protect, and how long does entry last?

A) **Gate all `/admin/*` routes**; once entered, remembered for the session via a signed httpOnly cookie (re-prompt on browser close / after N hours)

B) Gate `/admin/*`; re-prompt on **every visit** to admin (no memory)

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q3 — Admin preview binder: contents
The preview binder should show…

A) **Every card in the pool** (all themes, all rarities) as fully "owned", grouped by theme — a complete catalog for you to inspect

B) Only a **sample** (one card per rarity/theme)

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q4 — Admin preview: which effects get trigger buttons?
Buttons to fire on demand (from Increment 2 sensory + Increment 3 asteroids):

A) **All of them** — card reveal (per rarity), confetti, set-complete fanfare, each SFX, BGM toggle, asteroid streak

B) **Reveal + confetti + set-complete** only (the big visual moments)

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q5 — Dinosaurs: roster size + rarity mix
Replace the 12 Superhero cards (6 common / 3 rare / 2 epic / 1 legendary). For Dinosaurs:

A) **Same 12 cards, same rarity mix** — clean 1:1 swap (I'll pick well-known kid-friendly dinos: T. rex, Triceratops, Stegosaurus, Velociraptor, Brachiosaurus, Ankylosaurus, Spinosaurus, Pteranodon, etc.)

B) Different count — tell me how many

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q6 — Existing kids who own Superhero cards: migration
Superhero cards are being removed from the pool. For any child who already collected them:

A) **Delete their Superhero collection entries** (cards gone from every binder; clean pool). Simplest, but kids "lose" those cards.

B) **Keep owned Superhero cards** as orphaned/legacy (hidden from new pulls but still shown in their binder)

C) Doesn't matter — this is pre-launch / test data; just wipe and reseed

D) Other (describe after [Answer]:)

[Answer]: C

---

## Q7 — "True fun fact + source": which cards?
A verifiable fact with a real source only makes sense for **real** subjects. Superheroes and Mythic Creatures are fictional — they can't have a true, sourceable fact.

A) **Real-subject themes only** (Animals + new Dinosaurs) get a true fact + source URL; Mythic keeps its imaginative `eduText` with no source link

B) **All cards** get a `sourceUrl` field, but only real ones are populated (Mythic left blank / "legend, not fact")

C) Replace Mythic Creatures too with a real category so everything is factual

D) Other (describe after [Answer]:)

[Answer]: B but for fictional, the text will be about how the myth/legend came about and source to that

---

## Q8 — Fact + source: data model & authoring
The card's existing `eduText` is a short blurb. For the fact + source:

A) **Reuse `eduText` as the fun fact** + add a new `sourceUrl` field; I author facts and cite reputable sources (e.g. Wikipedia, museum/.edu/.gov sites)

B) Add **both** a new `factText` and `sourceUrl` (keep `eduText` separate for flavor)

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q9 — Where the source link appears
The source link is for your fact-checking. Show it…

A) **Admin only** — in the admin preview binder + admin card views (kids see the fact, never the link)

B) Admin **and** kids' card detail (link visible to everyone)

C) Other (describe after [Answer]:)

[Answer]: A

---

## Q10 — Scope confirmation
This increment spans a **DB schema migration** (add `sourceUrl`), a **reseed** (dinosaurs + facts + sources, updated animal facts), **auth** (passcode), and **admin UI** (preview + triggers + source links). Existing routes/tests otherwise frozen. Agree with this scope?

A) Yes, proceed with all four features together

B) Split — do a subset first (tell me which)

C) Other (describe after [Answer]:)

[Answer]: A
