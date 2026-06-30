# Card-Authoring Prompt (paste into claude.ai)

Use this to generate the full `seed/cards.json`. Copy everything in the box into
a claude.ai chat, then save the JSON it returns over `seed/cards.json`.

---

> You are creating data for a children's collectible-card app. Output **only**
> valid JSON (no markdown, no commentary) matching exactly this shape:
>
> ```json
> {
>   "themes": [
>     { "name": "<Theme>", "cards": [
>       { "name": "<Card>", "rarity": "common|rare|epic|legendary",
>         "eduText": "<one short kid-friendly fact, <=120 chars>",
>         "imagePrompt": "<short visual description of the subject>" }
>     ] }
>   ]
> }
> ```
>
> Requirements:
> - **3 themes**: "Animals", "Superheroes", "Mythic Creatures".
> - **12 cards per theme** (36 total).
> - Per theme, rarity spread (pyramid): **6 common, 3 rare, 2 epic, 1 legendary**.
> - `eduText`: a true, simple, age-appropriate fact (readable by a 7-year-old),
>   max ~120 characters. For made-up "Superheroes"/"Mythic Creatures", make the
>   fact a fun positive trait or a real-world tie-in (e.g. a value, an animal it's
>   based on) — keep it wholesome and non-violent.
> - `imagePrompt`: a short, concrete, **kid-friendly, non-scary** description of
>   the subject only (no art-style words — the app adds the style). Avoid weapons,
>   blood, or frightening imagery.
> - Names unique within a theme.
> - Output JSON only.

---

After saving, review the generated images:

```bash
npm run seed -- --review     # generates images to seed/review/ (no DB writes)
# eyeball seed/review/*, then:
npm run seed -- --publish    # uploads to Blob + inserts cards (idempotent)
```
