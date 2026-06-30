# Component Methods

Method signatures + high-level purpose + I/O. Business rules detailed later in Functional Design. Mutations are Server Actions; reads are Server Components / server functions. `[SEC]` = parent-authorized; `[PBT]` = property-tested.

## AuthService (backs AuthGate)
- `getSession(): Session | null` — current auth session.
- `requireParent(): ParentIdentity` `[SEC]` — throw/redirect if not an allowlisted parent.
- `isAllowlisted(email: string): boolean` `[SEC]` — allowlist check.

## ProfileService (backs ProfilePicker, AdminPanel)
- `listChildren(): Child[]` — all child profiles for the parent.
- `getChild(childId): Child` — single profile.
- `createChild(input: {name, avatar}): Child` `[SEC]` — add profile.
- `updateChild(childId, patch): Child` `[SEC]` — edit name/avatar.
- `removeChild(childId): void` `[SEC]` — delete profile + its collection (confirmed).
- `setActiveProfile(childId): void` — scope session to a child.

## PullService (backs PullEngine)
- `getBalance(childId): number` — current pull-token balance.
- `pull(childId): PullResult` `[SEC-child-scope][PBT]` — atomically: verify balance ≥1, decrement by 1, draw one rarity-weighted card, upsert into collection (increment duplicate count), return `{card, isDuplicate, newBalance}`. Rejects if balance 0 (no spend). No double-spend under concurrent calls.
- `drawCard(): Card` `[PBT]` — pure-ish rarity-weighted random selection from active pool (separable for property tests).

## CollectionService (backs Binder, AdminPanel)
- `getCollection(childId): CollectionView` — owned cards grouped by theme with counts.
- `getThemeProgress(childId): ThemeProgress[]` `[PBT]` — M distinct / N total per theme.
- `getCardDetail(childId, cardId): OwnedCard` — card + owned count for detail view.

## TokenService (backs RewardManager)
- `grantTokens(childId, n: number): number` `[SEC][PBT]` — parent-only; balance += n; returns new balance; balance stays ≥ 0.
- `adjustTokens(childId, delta: number): number` `[SEC][PBT]` — add/subtract; clamps at 0.
- `getBalance(childId): number` — read (shared with PullService).

## CardPoolService (backs CardRenderer data, PullEngine)
- `listThemes(): Theme[]` — themes in the pool.
- `listCards(themeId?): Card[]` — pool cards (optionally by theme).
- `getCard(cardId): Card` — single card (picture, name, rarity, theme, eduText).

## SeedService (backs CardPool/Seeder — offline)
- `loadSeedData(path): SeedCard[]` — parse authored seed JSON.
- `generateImage(prompt): Buffer|URL` — call Pollinations.ai for a card image.
- `uploadImage(buffer): blobUrl` — store in Vercel Blob.
- `seedPool(seedCards): void` — generate/upload images, insert themes+cards; idempotent; supports review-before-publish flag.

## CardRenderer (UI, no service)
- `<Card card interactive reducedMotion?>` — renders frame by rarity, holographic + tilt effects bound to pointer/`deviceorientation`, scales intensity by rarity, degrades on reduced-motion / low-end.

## Types (sketch)
```
Rarity = 'common' | 'rare' | 'epic' | 'legendary'
Card   = { id, themeId, name, rarity, imageUrl, eduText }
Theme  = { id, name, cardCount }
Child  = { id, name, avatar }
OwnedCard = { card: Card, count: number }
PullResult = { card: Card, isDuplicate: boolean, newBalance: number }
ThemeProgress = { themeId, owned: number, total: number }
```
