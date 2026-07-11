# INCREMENT 7 — UX Polish & Fixes: Clarifying Questions

Answer inline by filling each `[Answer]:` tag with a letter (A–E). Add notes if helpful.

---

## Q1 — Cat icon (your item 2)
Heads-up: a **cat 🐱 avatar already exists** as a selectable preset (`AVATAR_PRESETS`). It's available today in the profile add/edit form. So what did you actually want?

- A) Nothing to do — cat already exists; my old profiles just predate it, I'll re-pick it
- B) Make **cat the default** selected avatar for new profiles
- C) Add **more new icons** (tell me which in notes)
- D) The cat isn't showing where I expect (tell me where in notes)

[Answer]: the cat icon is not explicit enough, increase the size of the avatar

---

## Q2 — Pull cycling animation style (your item 1)
During the few-second build-up before landing on the pulled card, show:

- A) **Slot-machine of real card fronts** — rapidly cycle random card art from the pool, decelerate, land on the actual pulled card *(recommended — max anticipation, reuses card art)*
- B) Shuffling **card-backs** only, then flip to reveal the real card
- C) Reuse the **easter-egg roulette** visual style for consistency

[Answer]: A

---

## Q3 — Cycling duration
How long should the build-up run before landing?

- A) ~2 seconds
- B) ~2.5 seconds *(recommended)*
- C) ~3.5 seconds
- D) Other (notes)

Note: reduced-motion users will **skip** the cycle and see the card immediately (accessibility).

[Answer]: B

---

## Q4 — Where should "edit name/icon" live (your item 3)?
The edit capability already exists in code but isn't surfaced in the UI. Where should the Edit affordance appear?

- A) **Admin → Manage Profiles** page, an Edit button per row (parent-gated) *(recommended — matches existing passcode/parent guards)*
- B) Kid-facing profile picker (no gate)
- C) Both places

[Answer]: A

---

## Q5 — Stable profile ordering (your item 4)
Fix the re-shuffle by sorting profiles consistently. Order profiles by:

- A) **Creation order** — oldest first (adds a `created_at` column, one migration) *(recommended — most intuitive, stable forever)*
- B) **Name A→Z**
- C) Freeze current arbitrary order (order by `id`)

[Answer]: B

---

## Q6 — Galaxy back button fix (your item 5)
Confirmed: `← Home` is at the bottom of the galaxy page. Preferred fix:

- A) Move **← Home into the top header** (sticky, always visible) *(recommended)*
- B) Add a floating back button pinned to a screen corner
- C) Both a top header link and keep the bottom one

[Answer]: A

---

## Q7 — Scope confirmation
Ship all 5 items as **INCREMENT 7 (LIGHT cadence, single increment)** — like increments 2–6?

- A) Yes, all 5 together *(recommended)*
- B) Split — do some now, defer others (say which in notes)

[Answer]: A
