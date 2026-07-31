# Increment 20 — Code Generation Summary

**Date**: 2026-07-31
**Unit**: single (content authoring)
**Result**: two new themes authored into `seed/cards.json`; no application code
touched, no schema migration, no new dependencies.

## Plan steps

- [x] 1. Confirm "category" == `themes` row and that no theme name is referenced
      in app code (grep over all 8 existing names across `.ts`/`.tsx` → 0 hits)
- [x] 2. Author **Spooky Legends** — 30 cards, 15/8/5/2
- [x] 3. Author **Deep Sea Creatures** — 30 cards, 15/8/5/2
- [x] 4. Merge additively into `seed/cards.json` (round-trip-verified formatting,
      so the diff is pure insertion: +430 lines, −0)
- [x] 5. Validate: card counts, rarity pyramid, name uniqueness within theme and
      against all 240 pre-existing cards, `eduText` ≤ 120 chars
- [x] 6. Validate the whole file against `seedFileSchema` via `loadSeed`
- [x] 7. HTTP-check all 60 `sourceUrl`s (200 or redirect-to-200)
- [x] 8. Refresh the stale `seed/AUTHORING_PROMPT.md`
- [x] 9. `pnpm typecheck`, `pnpm test`, `pnpm build`

## Files changed

| File | Change |
|---|---|
| `seed/cards.json` | +2 themes / +60 cards (8 → 10 themes, 240 → 300 cards). Purely additive. |
| `seed/AUTHORING_PROMPT.md` | Rewritten — it still described the original 3 themes × 12 cards at a 6/3/2/1 pyramid and omitted `sourceUrl` entirely. Now documents one-theme-at-a-time authoring at 30 cards / 15-8-5-2, the `sourceUrl` requirement, cross-theme name uniqueness, and `--sync` (not `--publish`) as the publish path. |

## Content

**Spooky Legends** (FR1) — classic horror-fiction + world folklore, deliberately
disjoint from the existing `Mythic Creatures` theme (so no Yeti, Banshee, Troll,
Goblin, Basilisk or Kraken).

- *common (15)*: Ghost, Skeleton, Jack-o'-Lantern, Scarecrow, Gargoyle, Zombie,
  Witch, Black Cat, Bogeyman, Will-o'-the-Wisp, Jackalope, Poltergeist, Bunyip,
  Imp, Boggart
- *rare (8)*: Chupacabra, Mothman, Jersey Devil, Baba Yaga, Golem, Black Shuck,
  Kelpie, Jiangshi
- *epic (5)*: Werewolf, The Mummy, Bigfoot, Loch Ness Monster, Headless Horseman
- *legendary (2)*: Dracula, Frankenstein's Monster

**Deep Sea Creatures** (FR2) — true deep/mid-water species only, so no name
collides with the sea life already in `Animals` (Octopus, Bottlenose Dolphin,
Great White Shark, Orca, Blue Whale, Whale Shark, Sea Otter, Emperor Penguin).

- *common (15)*: Anglerfish, Vampire Squid, Giant Isopod, Dumbo Octopus,
  Blobfish, Lanternfish, Sea Pig, Hatchetfish, Barreleye Fish, Fangtooth,
  Mariana Snailfish, Sea Cucumber, Yeti Crab, Glass Squid, Zombie Worm
- *rare (8)*: Frilled Shark, Goblin Shark, Chambered Nautilus, Gulper Eel,
  Viperfish, Dragonfish, Bigfin Squid, Pompeii Worm
- *epic (5)*: Giant Squid, Colossal Squid, Greenland Shark, Japanese Spider Crab,
  Sperm Whale
- *legendary (2)*: Coelacanth, Megamouth Shark

## Requirement coverage

| Req | Evidence |
|---|---|
| FR1 / FR2 | 30 cards each, counted `{common:15, rare:8, epic:5, legendary:2}` |
| FR3 | `loadSeed(seed/cards.json)` → "schema OK — 10 themes, 300 cards" |
| FR4 | 0 duplicates within each theme; 0 collisions against the 240 existing cards |
| FR5 | All 60 URLs HTTP-checked. Two 404s found and fixed: `Witch_(icon)` → `Witchcraft`, `Headless_Horseman_(Sleepy_Hollow)` → `The_Legend_of_Sleepy_Hollow` |
| FR6 | Executed in Build & Test |
| NFR1 / NFR2 | Spooky prompts steered cute/comical (smiling caped vampire, clumsy zombie in mismatched socks, gentle green giant holding a flower). No weapons, blood or gore. La Llorona, Krampus and Wendigo deliberately excluded as too dark for the audience |
| NFR3 | Fictional subjects get story/folklore facts (Bram Stoker 1897; Mary Shelley at 18; Irving's 1820 tale), never fiction-as-fact. Cryptid entries state the debunking where there is one (chupacabra sightings are mangy coyotes; Loch Ness surveys found eel DNA) |
| NFR4 | Longest new `eduText` = 102 chars (existing corpus max is 110) |
| NFR5 | `insertCardIfNew` / `cardExists` unchanged |
| NFR6 | `pnpm typecheck` clean · `pnpm test` 174/174 · `pnpm build` ✅ · 0 new deps |

## Notes

- No test was added. The new content is data, and the existing suite already
  covers the seed schema and the pool writer; the meaningful validation here
  (pyramid, cross-theme uniqueness, live `sourceUrl`s) was run as a one-off
  check against the real file rather than frozen into a test that would need
  updating with every future theme.
- `--sync` prunes themes and cards absent from the seed. The diff is
  insertion-only, so the expected prune count is 0 — verified in Build & Test.
