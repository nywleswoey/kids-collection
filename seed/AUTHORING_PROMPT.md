# Card-Authoring Prompt

Use this to author a **new theme** (category) for `seed/cards.json`.

**Author in-repo, with `seed/cards.json` open.** The hardest constraint below is *"not already used by
a card in any other theme"*, and a chat session that cannot read the file is being asked to avoid
collisions with 360 names it has never seen. Paste the box into a session that has the file.

The pool is additive: `pnpm seed --sync` image-generates and inserts only cards that are new, and prunes
any theme/card you *remove* from the seed. Never delete a theme you want to keep — that deletes it from
every child's collection too.

**Several rules below are now enforced by the schema** (`src/features/pool/seed-schema.ts`), so
`pnpm seed` of any kind fails fast rather than publishing a broken theme: exactly 30 cards, the exact
rarity pyramid, card names unique across the *whole* pool, and `eduText` ≤ 120 characters. A theme must
therefore be authored to completion before it enters `seed/cards.json` — the file can no longer be
committed half-authored.

---

> You are creating data for a children's collectible-card app. Output **only**
> valid JSON (no markdown, no commentary) matching exactly this shape:
>
> ```json
> {
>   "name": "<Theme>",
>   "cards": [
>     { "name": "<Card>", "rarity": "common|rare|epic|legendary",
>       "eduText": "<one short kid-friendly fact, <=120 chars>",
>       "imagePrompt": "<short visual description of the subject>",
>       "sourceUrl": "<real URL backing the fact / naming the legend's origin>" }
>   ]
> }
> ```
>
> Requirements:
> - **Theme name**: short and title-case, matching the existing set ("Animals",
>   "Mythic Creatures", "Dinosaurs", "Superheroes", "Country", "Famous People",
>   "Weird Insects", "Special Plants", "Spooky Legends", "Deep Sea Creatures",
>   "Flying Machines", "Ocean Machines").
> - **30 cards**, rarity pyramid: **15 common, 8 rare, 5 epic, 2 legendary**.
>   Every theme has exactly this shape — set-completion rewards and the rarity
>   filters depend on it. *(Schema-enforced.)*
> - Names unique within the theme, **and** not already used by a card in any
>   other theme. Check `seed/cards.json` first. *(Schema-enforced, globally.)*
> - `eduText`: a true, simple, age-appropriate fact (readable by a 7-year-old),
>   **max 120 characters**. For fictional subjects, make the fact about the *story
>   or folklore* ("Mary Shelley wrote Frankenstein at 18…") — never present
>   fiction as fact. *(Schema-enforced.)*
> - `sourceUrl`: a real, resolvable URL (Wikipedia is fine) backing the fact.
>   Verify it returns 200 — parenthesised suffixes often 404.
> - `imagePrompt`: a short, concrete, **kid-friendly, non-scary** description of
>   the subject only (no art-style words — the app appends `ART_STYLE`).
>
> **Content rule — applies to every theme:**
>
> - **Weapons and military hardware are permitted.** A fighter's guns, an aircraft
>   carrier's deck, a submarine's torpedo tubes, a knight's sword — visible
>   weaponry on any subject is fine.
> - **Gore and violence are prohibited.** Nothing firing, attacking, burning,
>   sinking, exploding or being destroyed. No blood, wounds, injury or casualties.
>   No combat scenes. The subject sits still and is looked at.
> - **Non-scary and kid-friendly still applies in full.** Steer spooky subjects
>   cute or comical (a smiling vampire, a clumsy zombie).
> - **`eduText` covers engineering, exploration, nature, story or history — never
>   combat.** Not what a thing destroyed; what it *is*, or what it *reached*.
> - **At most 2–3 military subjects per theme.** A *military* submarine counts
>   against the cap; a *research* submersible (Alvin, Trieste) does not. Judge it
>   by what the subject is for.
>
> Output JSON only.

---

Merge the returned theme object into the `themes` array of `seed/cards.json`. **Append it** — array
position is the theme's display order, and `themes.sort_order` is a contract. Never insert mid-array,
never reorder existing entries: that reshuffles what the children already know.

Then:

```bash
pnpm seed --check-urls   # every sourceUrl in the file must return 200
pnpm seed --review       # generates images for NEW cards only, into seed/review/
# eyeball every generated image: kid-safety, and the weapons/gore boundary above
pnpm seed --sync         # publishes the REVIEWED bytes -> Blob -> insert (idempotent)
```

`--review` skips cards already published and cards already reviewed, so an interrupted run resumes.

**To reject an image, change its `imagePrompt` — deleting the file is not enough.** Pollinations
returns the *same bytes for the same prompt* (verified: two calls, identical sha256), so deleting a
review file and re-running `--review` regenerates the picture you just rejected. Editing the
`imagePrompt` changes the content hash, which both asks for a different picture and makes the old
review file stop matching. Delete the stale file too if you want to keep the folder tidy.

Prompt wording that helps: name **one** subject ("a single ..."), give a viewpoint ("side view"), and
put it somewhere plain ("parked on grass"). Sleek aircraft photographed in flight are the shape this
model most often renders as two overlapping copies.

`--sync` refuses to insert a card that has no reviewed image. If it says so, run `--review` first —
`--allow-unreviewed` exists but defeats the guarantee that no unreviewed image reaches a child.

If `--sync` reports a pending **prune**, or asks you to type a collection-row count: **stop.** Something
was renamed or dropped in the seed file. Fix the file; do not pass `--allow-prune`.
