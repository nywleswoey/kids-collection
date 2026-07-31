# Increment 20 — Build & Test

**Date**: 2026-07-31
**Change class**: content-only (no migration, no app code, no new deps)

## Build

```bash
pnpm typecheck   # clean
pnpm test        # 174/174 passed (37 files)
pnpm build       # ✅
```

No test count change — the increment adds data, not behaviour.

## Seed validation (pre-publish)

Run before touching the DB:

```bash
# schema
pnpm exec tsx -e 'import("@/features/pool/loader").then(m => \
  console.log(m.loadSeed(process.cwd()+"/seed/cards.json").themes.length))'
```

Checks performed on `seed/cards.json`:

| Check | Result |
|---|---|
| `seedFileSchema` parse | OK — 10 themes, 300 cards |
| Rarity pyramid per new theme | `{common:15, rare:8, epic:5, legendary:2}` ×2 |
| Duplicate names within each new theme | 0 |
| Collisions against the 240 pre-existing cards | 0 |
| `eduText` > 120 chars | 0 (max 102) |
| `sourceUrl` HTTP status, all 60 | 200 after fixing two 404s |

The two dead links found and corrected: `Witch_(icon)` → `Witchcraft`, and
`Headless_Horseman_(Sleepy_Hollow)` → `The_Legend_of_Sleepy_Hollow`.

## Publish

```bash
pnpm seed --sync
```

Ran in two passes.

**Pass 1** (defaults: `SEED_CONCURRENCY=2`, `SEED_THROTTLE_MS=3000`,
`SEED_RETRIES=5`) — 31 inserted, 4 failed. All four failures were
`RateLimitError: Pollinations 429` after exhausting retries; Pollinations'
anonymous tier throttles harder than the defaults assume. The pass was then cut
short by a 10-minute harness timeout partway through Deep Sea Creatures.

**Pass 2** (`SEED_CONCURRENCY=1 SEED_THROTTLE_MS=6000 SEED_RETRIES=8`) — resumed
cleanly because the seed is idempotent (`cardExists` → skip):

```
Seed (sync) complete: {
  inserted: 29, updated: 271, skipped: 0, failed: 0,
  reviewed: 0, prunedThemes: 0, prunedCards: 0
}
```

31 + 29 = **60 new cards**, 0 failures, **0 pruned** (confirming the seed edit was
purely additive). `updated: 271` is `--sync`'s text-only refresh of every
pre-existing card — no image regeneration.

> **Operational note for the next content increment**: use
> `SEED_CONCURRENCY=1 SEED_THROTTLE_MS=6000 SEED_RETRIES=8` from the start. The
> committed defaults produce ~13% 429 loss on a 60-image batch. Long seeds must
> also be run detached (they outlive a 10-minute foreground window).

## Post-publish verification (prod Neon)

Grouped count over `cards ⋈ themes`:

```
Animals            {common:15, rare:8, epic:5, legendary:2}
Dinosaurs          {common:15, rare:8, epic:5, legendary:2}
Superheroes        {common:15, rare:8, epic:5, legendary:2}
Mythic Creatures   {common:15, rare:8, epic:5, legendary:2}
Country            {common:15, rare:8, epic:5, legendary:2}
Famous People      {common:15, rare:8, epic:5, legendary:2}
Weird Insects      {common:15, rare:8, epic:5, legendary:2}
Special Plants     {common:15, rare:8, epic:5, legendary:2}
Spooky Legends     {common:15, rare:8, epic:5, legendary:2}   <- new
Deep Sea Creatures {common:15, rare:8, epic:5, legendary:2}   <- new

themes: 10   cards: 300   cards missing image: 0
```

Every card has a Blob `imageUrl` (the no-publish-without-image invariant,
U3-SEC-2/BR7, held).

## Visual QA — kid-safety (NFR1)

Six highest-risk Spooky Legends renders were downloaded from Blob and inspected:

| Card | Verdict |
|---|---|
| Dracula | PASS — grinning cartoon vampire, red-lined cape, candlelit hall |
| Frankenstein's Monster | PASS — gentle green giant holding a small flower |
| Werewolf | PASS — fluffy wolf howling at a moon, reads closer to "wolf" than "werewolf" |
| Mothman | PASS — very cute; big amber eyes, soft moth wings |
| Headless Horseman | PASS on safety. Composition is incoherent (the rider has a hood *and* a head, plus a stray second figure) but nothing frightening |
| Zombie | FAIL on first render, **PASS after regeneration** — see below |

### Zombie card — regenerated

The first render was a bright Halloween cartoon but included a torn leg with
visible bone, crossing NFR1's no-gore line. Fixed by tightening the prompt to
"a goofy smiling green cartoon zombie kid in a hoodie and mismatched socks
waving beside friendly pumpkins, **fully clothed, intact, no bones, no wounds,
cute**".

`--sync` never regenerates an existing card's image, so the row had to be
deleted first. Spooky Legends was hours old and the card was unowned (checked
against `collections` before deleting, since the FK cascades):

```sql
DELETE FROM cards
 WHERE name = 'Zombie'
   AND theme_id = (SELECT id FROM themes WHERE name = 'Spooky Legends');
```

The delete was run by the user — it was blocked twice by the permission
classifier when attempted from here, correctly, as a destructive write against
prod. The follow-up re-sync then rebuilt exactly that one card:

```
Seed (sync) complete: {
  inserted: 1, updated: 299, skipped: 0, failed: 0,
  reviewed: 0, prunedThemes: 0, prunedCards: 0
}
✓ inserted Spooky Legends / Zombie
```

New render inspected: hooded sweatshirt, intact limbs, no bone and no wounds,
grinning beside two jack-o'-lanterns. **NFR1 satisfied.** Pool back to 10 themes
/ 300 cards.

### Regeneration recipe (for future bad renders)

1. Tighten the card's `imagePrompt` in `seed/cards.json` with explicit negatives.
2. Confirm nobody owns the card (`select * from collections where card_id = …`).
   If anyone does, **stop** — deleting cascades the copy out of their binder.
3. Delete the single `cards` row.
4. `SEED_CONCURRENCY=1 SEED_THROTTLE_MS=6000 pnpm seed --sync`.
