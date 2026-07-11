# INCREMENT 9 — Design (LIGHT)

## FR1 — Galaxy tabs
**NEW client `src/features/binder/GalaxyView.tsx`**
- Props: `sections: ThemeSection[]` (serializable), rendered by the server binder page.
- State `active: string` = "all" | themeId (default "all").
- Sticky tab bar (`sticky top-[76px] z-[9]` under the header) of chips: ★ All + each `section.theme.name`; `aria-pressed`; active highlighted (`pill--gold`).
- Body: `active === "all" ? sections : sections.filter(s => s.theme.id === active)` → map `ThemeSection`.
- **binder/page.tsx**: keep header; replace the inline `sections.map` with `<GalaxyView sections={binder.themes} />`. Empty-state unchanged.

## FR2/FR3 — Pull chips (prominent + persistent + on result)
**PullButton.tsx**
- Replace `<select>` with a chip row: 🎲 Random + `themes.map`. Buttons set `themeId`; active highlighted; `aria-pressed`.
- Show the chip row **always** when `!outOfTokens` (including with a result/roulette visible), so category is switchable before the next Discover. Remove the `!outcome && !cycling` gate.
- `themeId` state already persists across pulls (no reset) — satisfies FR3 persistence.

## FR4 — Special egg tickets
### Schema + migration
- **db/schema.ts** `children`: add `epicTickets: integer("epic_tickets").notNull().default(0)`, `luckyTickets: integer("lucky_tickets").notNull().default(0)`; add checks `epic_tickets >= 0`, `lucky_tickets >= 0`.
- `pnpm db:generate` → migration `0002_*`. Post-deploy `pnpm db:migrate`.

### Types
- `lib/types.ts` `Child`: add `epicTickets`, `luckyTickets`. `AdminChildRow`: add `epicTickets`, `luckyTickets`.

### Offer
- **offer.ts** `OfferPayload`: add optional `ticket?: "epic" | "lucky"`. (Signed JSON carries it; `verifyOffer` returns it — no extra validation needed.)

### Server
- **token-service.ts**: `grantSpecial(childId, kind: "epic"|"lucky", delta)` — parent-only, `GREATEST(0, col + delta)`, returns new balance. `getSpecialBalances(childId)` → `{epic, lucky}`.
- **pull-service.ts**:
  - `pullSpecialEgg(childId, kind)`: read that ticket balance; if `< 1` return `{outOfTokens:true}`. Pick choices (`pickEasterEggChoices` for epic, `pickCommonRareChoices` for lucky) from full pool; if empty throw. Sign offer with `{childId, cardIds, exp, ticket: kind}` (NO spend yet). Return `EasterEggOutcome` (newBalance = current normal tokens).
  - `claimEasterEgg`: if `payload.ticket`, atomically spend that special ticket (`update ... set col = col - 1 where id AND col >= 1 returning col`); if none → `{outOfTokens:true}`; upsert card; `newBalance` = current normal `pullTokens`. Else (no ticket) existing normal-token path. Single-use guaranteed by the atomic special spend.
- **actions.ts**: `pullSpecialEggAction(kind)` → `pullSpecialEgg(activeChild, kind)`, revalidate. `grantSpecialTicketAction(childId, kind, amount)` → `grantSpecial`, revalidate `/admin`.

### UI
- **PullButton.tsx**: new props `epicTickets`, `luckyTickets`. Local state mirrors them. When `> 0`, render "✨ Epic Pick (n)" / "🍀 Lucky Pick (n)" buttons; onClick → `pullSpecialEggAction(kind)`, set outcome (egg), track `activeTicket` kind; on `EasterEggPicker.onDone`, decrement that ticket in local state.
- **pull page**: fetch `getSpecialBalances`; pass to PullButton.
- **admin service getAdminOverview**: select the new columns; include in row. **AdminChildRow** type updated.
- **ChildAdminRow / GrantControl**: add compact +/- controls for epic & lucky tickets calling `grantSpecialTicketAction`. Keep existing 🎟️ control.

## Tests
- Existing egg/sacrifice PBT unaffected. Add (optional) a small check that `pullSpecialEgg` maps kind→picker (integration-ish; DB-bound → rely on typecheck+build). Ticket atomicity is DB-level.

## Risk
- FR4 touches money-path (tokens). Mitigate: special spend only at claim, atomic guard, offer pins kind. Normal egg path unchanged. Migration additive (defaults 0) — safe on existing rows.
