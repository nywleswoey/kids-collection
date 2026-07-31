# Card-Authoring Prompt (paste into claude.ai)

Use this to author a **new theme** (category) for `seed/cards.json`. Copy the box
into a claude.ai chat, then merge the returned theme object into the `themes`
array of `seed/cards.json`.

The pool is additive: `pnpm seed --sync` image-generates and inserts only cards
that are new, and prunes any theme/card you *remove* from the seed. Never delete
a theme you want to keep — that deletes it from every child's collection too.

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
>   "Dinosaurs", "Mythic Creatures", "Weird Insects", "Special Plants",
>   "Spooky Legends", "Deep Sea Creatures", …).
> - **30 cards**, rarity pyramid: **15 common, 8 rare, 5 epic, 2 legendary**.
>   Every theme has exactly this shape — set-completion rewards and the rarity
>   filters depend on it.
> - Names unique within the theme, **and** not already used by a card in any
>   other theme. Check `seed/cards.json` first.
> - `eduText`: a true, simple, age-appropriate fact (readable by a 7-year-old),
>   max ~120 characters. For fictional subjects, make the fact about the *story
>   or folklore* ("Mary Shelley wrote Frankenstein at 18…") — never present
>   fiction as fact.
> - `sourceUrl`: a real, resolvable URL (Wikipedia is fine) backing the fact.
>   Verify it returns 200 — parenthesised suffixes often 404.
> - `imagePrompt`: a short, concrete, **kid-friendly, non-scary** description of
>   the subject only (no art-style words — the app appends `ART_STYLE`). Avoid
>   weapons, blood, or frightening imagery. Steer spooky subjects cute or
>   comical (a smiling vampire, a clumsy zombie).
> - Output JSON only.

---

Before publishing, sanity-check the card count, the rarity pyramid, name
collisions across all themes, and that every `sourceUrl` returns 200. Then:

```bash
pnpm seed --review     # optional: generate images to seed/review/ (no DB writes)
# eyeball seed/review/*, then:
pnpm seed --sync       # generate images for NEW cards -> Blob -> insert (idempotent)
```
