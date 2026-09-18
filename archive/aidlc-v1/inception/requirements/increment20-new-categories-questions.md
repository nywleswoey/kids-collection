# Increment 20 — Two New Categories: Clarifying Questions

Answer by filling the `[Answer]:` tag under each question with a single letter
(or free text where invited). One letter per question.

---

## Q1 — Name of the monster category

Existing theme names are short title-case nouns ("Animals", "Mythic Creatures",
"Weird Insects", "Special Plants"). Werewolf / Frankenstein's Monster / Dracula
are *classic horror-fiction & folklore* figures — distinct from the existing
"Mythic Creatures" theme (Griffin, Pegasus, Kraken…), which is world mythology.

- A. "Monsters"
- B. "Friendly Monsters"
- C. "Classic Monsters"
- D. "Spooky Legends"
- E. Other (write it)

[Answer]: D

---

## Q2 — Tone / scariness of the monster art

Every image gets the app's fixed art style appended
(`vibrant kid-friendly cartoon trading-card illustration, bright colors,
friendly, clean background, no text`), and the authoring rules forbid weapons,
blood, and frightening imagery.

- A. Cute & friendly — monsters drawn as smiling cartoon characters (safest, on-style)
- B. Playfully spooky — Halloween-costume vibe, big eyes, still non-scary
- C. Other (write it)

[Answer]: B

---

## Q3 — Name of the deep-sea category

- A. "Deep Sea Creatures"
- B. "Deep Sea"
- C. "Ocean Depths"
- D. Other (write it)

[Answer]: A

---

## Q4 — Cards per new theme

Every existing theme has exactly 30 cards with the rarity pyramid
**15 common / 8 rare / 5 epic / 2 legendary**. Set completion, rarity filters and
the set-completion reward all key off per-theme sets, so matching is safest.

- A. 30 cards each, same 15/8/5/2 pyramid (matches all 8 existing themes)
- B. Fewer (write how many)
- C. Other (write it)

[Answer]: A

---

## Q5 — Overlap with the existing "Animals" theme

"Animals" already contains sea life: Octopus, Bottlenose Dolphin, Great White
Shark, Orca, Blue Whale, Whale Shark, Sea Otter, Emperor Penguin.

- A. No duplicates — the deep-sea theme uses only true deep/mid-water species
  (anglerfish, vampire squid, giant isopod, dumbo octopus, yeti crab…)
- B. Duplicates allowed — a card may appear in both themes (separate cards)
- C. Move the sea animals out of "Animals" into the new theme (this *prunes* and
  re-creates those cards — children lose those copies from their collections)

[Answer]: A

---

## Q6 — `eduText` + `sourceUrl` for fictional monsters

Real creatures get a true fact plus a Wikipedia source. Werewolf/Dracula/
Frankenstein's Monster are fiction, so the "fact" has to be about the story or
the folklore, not the creature.

- A. Folklore / literary fact with a real Wikipedia `sourceUrl`
  (e.g. "Dracula was written by Bram Stoker in 1897…") — consistent with how
  "Mythic Creatures" cards are sourced today
- B. Invented wholesome trait, no real source
- C. Other (write it)

[Answer]: A

---

## Q7 — Image generation & publish path

60 new cards → 60 generated images. The seed CLI throttles ~3 s between requests
at concurrency 2, so expect roughly 3–5 minutes plus retries.

- A. `pnpm seed --review` first (writes 60 JPEGs to `seed/review/` for you to
  eyeball, zero DB/Blob writes), then `pnpm seed --sync` to publish
- B. Straight to `pnpm seed --sync` (generate → Blob → insert in one pass)
- C. Author the JSON only — I'll run the seed myself later

[Answer]: B
---

## Q8 — Deploy to production when done?

No schema migration is expected (themes/cards are data, upserted by the seed).
Cards become visible to children as soon as the seed publishes, independent of a
code deploy.

- A. Yes — publish the seed and push to Vercel prod
- B. Seed the DB but do not deploy
- C. Author only, no DB writes

[Answer]: A

---

## Note — Increment 19 Operations gate is still unticked

`aidlc-state.md` leaves Increment 19 (Unify Special Tickets → Easter Egg Ticket)
at an open Operations gate. Migration 0005 is applied to Neon prod, and local
`main` is level with `origin/main` (`d34d986`), so Vercel has almost certainly
auto-deployed already — the checkbox just never got ticked.

## Q9 — What to do about Increment 19

- A. Verify the prod deploy and tick the gate before starting Increment 20
- B. Start Increment 20 now; close Increment 19's gate at the end
- C. Leave Increment 19 alone, I'll handle it

[Answer]: B
