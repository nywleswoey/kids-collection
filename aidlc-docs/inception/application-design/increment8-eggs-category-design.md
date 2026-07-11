# INCREMENT 8 — Design (LIGHT)

## FR1 — Common/Rare egg
**easter-egg.ts**
- `const COMMON_RARE: Rarity[] = ["common","rare"]`.
- `pickCommonRareChoices(pool, n=5, rng=Math.random)` — filter common/rare, Fisher–Yates, slice n. (Mirror `pickEasterEggChoices`.)
- Reuse `rollEasterEgg` for the second independent roll.

**pull-service.ts** — inside `pull()`, after the epic+ egg block does NOT fire:
```
if (rollEasterEgg()) {
  const choices = pickCommonRareChoices(pool, 5);
  if (choices.length) { sign offer; refund token; return EasterEggOutcome }
}
```
Then normal draw. Egg outcome shape unchanged (choices/offer/newBalance).

**claimEasterEgg** — remove the `epic|legendary` gate; keep: valid signed offer, child match, `chosenCardId ∈ payload.cardIds`, card exists. Signed pin already prevents un-offered claims. Atomic spend + upsert unchanged.

Security note: safe because `payload.cardIds` is server-generated and HMAC-signed; client cannot inject a card outside the offer.

## FR2 — Sacrifice
**NEW src/features/pull/sacrifice.ts (PURE)**
- `nextTier(r)` → RARITIES[min(idx+1, last)].
- `rollUpgradeTier(r, rng)` → 50% `r`, 50% `nextTier(r)` (legendary→legendary both).
- `pickUpgradeCard(pool, tier, ownedIds:Set, rng)` → candidates = pool rarity==tier; unowned = candidates not in ownedIds; pick random from (unowned.length ? unowned : candidates). Return null if none.

**Service — src/features/binder/service.ts (or pull-service)**: `sacrifice(childId, cardId)`:
1. `requireParent()`.
2. Load source card (`getCard`) → its rarity. 404 if missing.
3. Atomic: `update collections set count = count - 3 where child+card AND count >= 3 returning count`. Empty → throw "not enough copies".
4. Build ownedIds set (`collectionMap`), compute `tier = rollUpgradeTier(source.rarity)`, `result = pickUpgradeCard(pool, tier, ownedIds)`. If null (tier empty), retry with source.rarity tier; else pick any.
5. Upsert result +1 (onConflictDoUpdate count+1).
6. Return `{ card: result, isDuplicate, sourceRarity, resultRarity }`.

**Action** `sacrificeAction(cardId)` — server action; revalidate `/play/binder` + `[cardId]`.

**UI — app/play/binder/[cardId]/page.tsx**: when `detail.count >= 3`, render NEW client `SacrificePanel` (button "✨ Sacrifice 3 → mystery upgrade"; on click calls action, shows result card via a small reveal + returns). Confirm via inline state (no blocking dialog).

## FR3 — Category pick
**pull-service.ts** `pull(childId, themeId?)`:
- `const drawPool = themeId ? pool.filter(c => c.themeId === themeId) : pool;` use `drawPool` for `drawCard`. Eggs still use full `pool`. Guard: if `drawPool` empty, use `pool`.

**actions.ts** `pullAction(themeId?)` → `pull(child.id, themeId)`.

**PullButton.tsx** — new `themes: {id,name}[]` prop; client `<select>` state `themeId` (default "" = Random); pass to `pullAction(themeId || undefined)`. Selector hidden while a result/roulette is showing.

**app/play/pull/page.tsx** — fetch `listThemes()`; pass `themes`.

## FR4 — Order
- **profiles/service.ts** `listChildren`: `.orderBy(sql\`lower(\${children.name})\`)` (import `sql`).
- **admin/service.ts** `getAdminOverview`: `db.select().from(children).orderBy(sql\`lower(\${children.name})\`)`.

## Tests (pure-logic harness)
- easter-egg.pbt: common/rare choices are all common|rare, distinct, ≤5.
- sacrifice.pbt (NEW): `rollUpgradeTier` never below source, ≤ +1, legendary caps; `pickUpgradeCard` prefers unowned, returns in-tier.
- FR3/FR4 = query-level; verified by build + inspection.

## Risk
- FR1 claim change: verify existing epic+ egg still claims (offer pin unchanged). FR2 only netnew mutation — guarded atomic. Low overall.
