# CONTEXT — kids-collection domain & architecture vocabulary

A shared glossary so code, reviews, and future architecture work name things the
same way. Domain nouns come from the app; architecture nouns from `/codebase-design`
(module, interface, depth, seam, adapter, leverage, locality).

## Domain

- **Child / profile** — a per-family player profile (`children` table). Selecting one
  is a post-auth convenience stored in an httpOnly cookie, re-validated against the
  DB; it is **not** a security boundary (all children belong to the one parent).
- **Collection** — a child's owned cards, one row per `(child, card)` with a `count`
  (`collections` table, `CHECK(count >= 1)`).
- **Pull** — spending a token to draw a rarity-weighted card. May branch into an
  **easter egg**: a signed pick-1-of-N **offer** the child claims later.
- **Ticket** — a spendable column on `children`: normal `pullTokens`, special egg
  tickets (`epic`/`lucky`), and rarity-pick tickets (`{rarity}_pick_tickets`).
- **Sacrifice** — burn N copies of a card for a rarity-pick ticket (same tier or one
  up, 50/50).
- **Trade** — atomic two-sided duplicate swap between two children.
- **Offer** — an HMAC-signed, expiring token pinning the exact cards/rarity the server
  chose, so a claim can't be swapped for an un-offered card (pull eggs, quiz answers).
- **Gate** — the admin passcode gate; issues a short-lived signed cookie.
- **Set-completion reward** — a bonus card granted once per `(child, theme, rarity)`
  set completed (the reward cascade: a bonus card can complete another set).

## Architecture — the persistence seam (Candidate 1)

Terms introduced by the Store-seam design (see
`docs/architecture/deepening-candidates.md`):

- **Port** — a per-aggregate persistence **interface** a service accepts as a
  dependency (rather than importing the `db` singleton). Deep by design: one method
  per atomic unit of persistence; transactions never cross the seam.
- **Store** — collective name for the ports. Named ports: **`ChildStore`**
  (token/ticket columns — `spendOne`, `incrementColumn`, `clampedGrant`, `readColumn`),
  **`CollectionStore`** (card copies — `grantCard`, `removeCard`, `swapCards`,
  `ownedCounts`, `cardCount`, `ownedCardIds`, `entries`, `tradableDuplicates`),
  **`ProfileStore`** (child-row CRUD — `list`, `find`, `create`, `update`, `remove`;
  complements `ChildStore` on the same `children` table), **`RewardStore`**,
  **`QuizStore`**.
- **Catalog** — the read-only port for the static card/theme pool (`listCards` /
  `getCard` / `listThemes`), injected like a Store so services stay testable.
- **Adapter** — a concrete port implementation. Two per port: the **pg adapter**
  (prod, the only place `import "server-only"` lives) and the **in-memory fake**
  (tests).
- **Factory (feature service)** — `makeTradeService(deps)` etc.: binds a feature's
  function cluster to its ports once, returns the cluster. Prod wires a singleton;
  tests construct with fakes.
- **Contract suite** — one shared, property-based conformance spec run against **both**
  adapters (fake in Vitest, pg in Build & Test) to prove they agree on the atomicity
  contracts (`spendOne` null-on-guard-fail, `clampedGrant` floors at 0, `swapCards`
  all-or-nothing). This is what makes the seam real rather than hypothetical.
