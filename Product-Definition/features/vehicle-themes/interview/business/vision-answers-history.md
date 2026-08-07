# Vision Answers History — Vehicle Themes (Business role)

Append-only. Every validated batch is recorded here verbatim, including caveats. Never rewritten or
truncated. The `vision-questions.md` buffer may be overwritten; this file is the durable record.

---

## Batch 1 — all 7 CORE questions (validated 2026-08-07T09:14:02Z)

Depth `quick`, interaction `batch`. Answers verbatim from `vision-questions.md`.

### Q1 [CORE] — Why these two, and what does "it worked" look like?
Options: (a) kid demand · (b) pool freshness · (c) educational breadth · (d) other.
**[Answer]: b and c**
→ Drivers recorded: pool freshness + educational breadth. **No checkable success criterion was
  stated** (the question offered "no metric" as a valid answer; the user selected drivers only).
  Pre-declared as OQ-VT-1.

### Q2 [CORE] — Exact theme names and card composition
**[Answer]: Ok with the recommendation. Same composition. Yes include spacecraft and submersibles.**
→ Theme names: **"Flying Machines"** and **"Boats and Ships"** (not the working titles "Aerial
  Vehicles" / "Water Vehicles").
→ Composition: standard **30 cards / 15 common · 8 rare · 5 epic · 2 legendary** per theme, unchanged.
→ Boundaries: **spacecraft IN** (Flying Machines), **submersibles IN** (Boats and Ships).
  Submarines were named in the same sub-question and NOT included in the answer — see OQ-VT-2.

### Q3 [CORE] — Where's the line on military vehicles?
Options: (a) hard exclude · (b) historic/iconic allowed, unarmed depiction · (c) no restriction · (d) other.
**[Answer]: b**
→ Historic/iconic military subjects permitted; `imagePrompt` never depicts weapons firing, `eduText`
  covers engineering or history, never combat.
→ The recommendation's numeric cap (2–3 military subjects per theme, pre-1970 or non-combat role) was
  **not explicitly affirmed** — see OQ-VT-3. The submarine sub-question was not answered — see OQ-VT-2.

### Q4 [CORE] — Dinosaurs and Superheroes fall off the chip row — acceptable?
Options: (a) accept · (b) raise cap to 10 · (c) raise cap + scroll · (d) reorder seed · (e) other.
**[Answer]: a**
→ **Accept.** `MAX_PULL_CATEGORIES` stays 8. Dinosaurs and Superheroes lose their pull-screen chips
  and remain collectable only via 🎲 Random and ticket flows. `themes.sort_order` is not touched
  (option (d) declined), preserving the parent vision's must-not-change contract.

### Q5 [CORE] — What's IN the first slice?
**[Answer]: all 8**
- [x] Author 30 cards for Flying Machines
- [x] Author 30 cards for Boats and Ships
- [x] Cross-theme name-collision check against all 300 existing cards
- [x] `sourceUrl` 200-check for all 60 cards
- [x] `pnpm seed --review` image pass + eyeball all 60 for kid-safety and weapon content
- [x] `pnpm seed --sync` publish to prod (Blob + Neon)
- [x] Whatever Q4 decided about the chip row → **no-op**, since Q4 = accept
- [x] Measure Blob/Neon usage before and after; report the free-tier runway (closes OQ-B-2)

### Q6 [CORE] — What's explicitly OUT?
**[Answer]: All mentioned are excluded.**
→ OUT: a third vehicle theme (Land Vehicles / Space) · an admin UI for adding themes · per-theme
  rarity tuning · a "new category!" announcement in the child UI · retiring an old theme to keep the
  pool at 10 · quiz questions for the new themes · raising `MAX_PULL_CATEGORIES`.
→ Consistent with Q4(a) and with Q2 (space rides inside Flying Machines rather than becoming its own theme).

### Q7 [CORE] — Cost and effort ceiling, and OQ-B-2
**[Answer]: follow recommendation** → a(i) · b(ii) · c(yes)
→ **a(i)** Strictly $0 — Pollinations anonymous tier and free Blob/Neon only, accepting a slow,
  retry-prone image run.
→ **b(ii)** Authoring + review split across multiple sessions. The 20-cards-per-theme reduction is
  declined; the rarity pyramid stays intact.
→ **c** This increment **produces the runway number**: current Blob GB and Neon rows against free-tier
  limits, per-theme cost, extrapolated to "N more themes remain". Feeds OQ-B-2 in the parent definition.

**Section Complete — Business, all CORE questions** · 2026-08-07T09:14:02Z

---

## Batch 1 — Amendment 1 (2026-08-07T09:26:41Z), during the approval loop

Three open questions resolved by the user. Prior answers stand except where restated below.

### OQ-VT-2 — RESOLVED: submarines are IN
**[Answer]: allow submarines and submersibles.**
→ "Boats and Ships" covers surface vessels, **submarines**, and **submersibles**. Supersedes the
  Q2(c) reading that admitted submersibles only.

### OQ-VT-3 — RESOLVED: cap affirmed, and the depiction rule loosened
**[Answer]: yes 2-3 per theme, weapons etc are ok, but no gore and violence.**
→ **Cap: 2–3 military subjects per theme**, as recommended.
→ **Depiction rule amended from Q3(b):** visible weaponry ON a vehicle is acceptable (a Spitfire's
  guns, a carrier's deck, a submarine's torpedo tubes). What stays prohibited is **gore and
  violence** — nothing firing, attacking, burning, sinking, or being destroyed; no blood, injury,
  or casualties; no combat scenes. `eduText` still covers engineering or history, not combat.
→ **Assumption recorded (flag if wrong):** a *military* submarine counts against the 2–3 cap; a
  *research* submersible (Alvin, Trieste) does not.
→ **This amends a repo-wide rule, not just this feature** — see OQ-VT-5.

### OQ-VT-1 — RESOLVED: no success metric, deliberately
**[Answer]: family app, no need for driver.**
→ The feature ships with **no measurable success criterion**, by explicit decision. Drivers (pool
  freshness, educational breadth) are recorded as rationale only. Not a gap; a choice.

### OQ-VT-4 — raised with the user, awaiting verdict
Theme names vs. agreed contents. Submarines being added makes "Boats and Ships" a looser fit than it
was at the time of Q2. Renaming after publish is a `themes.name` change in the DB, not a text edit.

### OQ-VT-5 — NEW, arising from the OQ-VT-3 amendment
`seed/AUTHORING_PROMPT.md` instructs *"Avoid weapons, blood, or frightening imagery"* for **every**
theme, and the parent vision names *"no unreviewed content path to a child, ever"* as a
must-not-change invariant. The amended depiction rule permits visible weaponry, so the standing
written rule and the decided rule now disagree. Unresolved: is the exception **theme-scoped** (the two
vehicle themes only, noted as such in the authoring prompt) or does the **global rule change** to
"weapons permitted, gore and violence prohibited"?

**Amendment 1 complete** · 2026-08-07T09:26:41Z

---

## Batch 1 — Amendment 2 (2026-08-07T09:33:10Z), during the approval loop

### OQ-VT-5 — RESOLVED: global rule change
**[Answer]: make the global rule change.**
→ The content rule changes **repo-wide**, not as a vehicle-themes exception. New rule:
  **visible weaponry is permitted on any subject in any theme; gore and violence are prohibited** —
  nothing firing, attacking, burning, sinking, or being destroyed; no blood, injury, or casualties;
  no combat scenes. The existing "non-scary / kid-friendly" instruction is unaffected and still
  applies (spooky subjects still steer cute or comical).
→ **Consequence, accepted by choice of "global":** this also relaxes the rule for the eight existing
  themes, most visibly **Superheroes** and **Spooky Legends**. No existing card is re-generated by
  this decision — the pool is additive and `--sync` never regenerates images for unchanged cards —
  so the change is forward-looking only.
→ **New work item, added to scope IN (Q5):** amend `seed/AUTHORING_PROMPT.md` so the pasted
  authoring prompt states the new rule. Until that file is edited, every future authoring session
  still receives the old "avoid weapons" instruction.
→ **Delta back to the parent definition:** the parent vision's kid-safety invariant *"no unreviewed
  content path to a child, ever"* is **unchanged and still binding** — the human review pass remains
  the gate. What moves is the content policy the reviewer applies.

**Amendment 2 complete** · 2026-08-07T09:33:10Z

---

## Batch 1 — Amendment 3 (2026-08-07T09:38:52Z), during the approval loop

### OQ-VT-4 — RESOLVED: theme renamed
**[Answer]: rename 'Boats and Ships', give it a cooler name.**
→ Naming delegated to the orchestrator. Chosen: **"Ocean Machines"**.
→ Rationale: it pairs deliberately with **"Flying Machines"** — the two new themes read as a matched
  set on the chip row, which none of the existing ten do. It covers surface vessels, submarines, and
  submersibles without straining (a submarine is not a ship, but it is plainly an ocean machine),
  which was the whole of OQ-VT-4. It sits cleanly beside the existing "Deep Sea Creatures":
  same waters, unmistakably the other kind of thing.
→ Alternatives considered and rejected: *Sea Machines* (thinner-sounding, same constraint),
  *Watercraft* (adult register — the existing set is concrete nouns a 7-year-old uses),
  *Ships and Submarines* (accurate, but enumerating contents in the name is what OQ-VT-4 was about),
  *Water Vehicles* (the original working title; accurate but flat).
→ **Caveat carried into authoring:** "Ocean" nudges the 30-card list toward salt water. If freshwater
  icons matter (a Venetian gondola, a canal narrowboat, a Mississippi paddle steamer), either admit
  them anyway — the name is a label, not a filter — or fall back to *Water Machines*, which keeps the
  Flying/Water pairing and drops the constraint. Flagged for the authoring session, not re-opened here.

**Final theme names: "Flying Machines" and "Ocean Machines".**

**Amendment 3 complete** · 2026-08-07T09:38:52Z

---
