# U3 — Domain Entities (Pool & Seeding)

U3 populates U1's `themes` and `cards`. It introduces a **seed input shape** (offline JSON), not a new DB table.

## Seed input — `seed/cards.json`
```jsonc
{
  "themes": [
    {
      "name": "Animals",
      "cards": [
        {
          "name": "Red Fox",
          "rarity": "common",
          "eduText": "Red foxes can hear a mouse squeak over 100 feet away.",
          "imagePrompt": "a friendly red fox, vibrant kid-friendly cartoon trading-card illustration"
        }
        // ... ~12 per theme
      ]
    }
    // Animals, Superheroes, Mythic Creatures
  ]
}
```

### SeedCard fields
| Field | Type | Notes |
|---|---|---|
| name | string | card name |
| rarity | enum | common/rare/epic/legendary |
| eduText | string | short age-appropriate fact (authored via claude.ai) |
| imagePrompt | string | prompt sent to Pollinations.ai |

### Theme
| Field | Notes |
|---|---|
| name | unique theme name |
| cards | SeedCard[] |

## Derived → DB
- Each theme → `themes` row.
- Each SeedCard → `cards` row: `imageUrl` filled after image generated + uploaded to Blob; `themeId` from the theme.

## Launch content (per answers)
- 3 themes × ~12 cards = ~36. Rarity pyramid per theme: ~6 common / 3 rare / 2 epic / 1 legendary.
- Art style: vibrant kid-friendly cartoon (baked into each `imagePrompt`).
