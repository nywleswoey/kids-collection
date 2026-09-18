# INCREMENT 16 — Build & Test Instructions

LIGHT-MEDIUM. **Migration 0004 required** (4 pick-ticket columns + `collection_rewards`).

## Build / Test
```bash
pnpm typecheck   # clean
pnpm test        # 99 passing
pnpm build       # success
DATABASE_URL=... pnpm db:migrate   # apply 0004 (local == prod Neon DB)
```
New tests: `collection-reward.pbt` (set-completion, touched pairs), `pick-tickets` (pickRarityChoices, column map).

## Manual QA
1. **FR1 sacrifice**: own ≥3 of a card → sacrifice → "You earned a {Rarity} Pick ticket" (rarity = same or one up). No card granted.
2. **FR2 redeem**: pull screen shows "🎯 {Rarity} Pick (n)" → pick-1-of-5 of that rarity → claim → ticket decrements, card added.
3. **FR3 admin**: GrantControl per-rarity +/- rows change the child's pick tickets; reflected on the pull screen.
4. **FR4 egg clarity**: any pick-1-of-5 (easter egg / epic / lucky / rarity pick) shows 🆕 on unowned choices and ➕×N on owned.
5. **FR5 collection reward**: complete every card of one rarity in a category → on next galaxy view, prominent modal ("You collected every {Rarity} {Theme}!") + bonus card + fireworks. Doesn't re-pop after dismiss. Grants exactly once per set.
6. **Cascade**: a bonus card that itself completes another set chains one more reward (bounded).

## Security / NFR
- All grants/claims/rewards server-authoritative + atomic. Pick-ticket claim single-use (signed offer). Reward exactly-once (UNIQUE + insert-before-grant). Admin grant behind parent+passcode. No secret in client bundle (verified).

## Deploy
- Migration 0004 applied to the Neon DB, then push `main` → Vercel prod.
