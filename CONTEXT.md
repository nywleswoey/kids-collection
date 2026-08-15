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
  (token/ticket columns — `spendOne`, `incrementColumn`, `clampedGrant`, `balances`),
  **`CollectionStore`** (card copies — `grantCard`, `removeCard`, `swapCards`,
  `ownedCounts`, `cardCount`, `tradableDuplicates`), **`RewardStore`**,
  **`QuizStore`**.
- **Catalog** — the read-only port for the static card/theme pool (`listCards` /
  `getCard`), injected like a Store so services stay testable.
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

## Architecture — the image-provider seam (#67, on map #61)

Terms introduced by putting the seed CLI's art generation behind a port
(`src/features/pool/providers/`), so a theme can be baked off across more than one
free provider:

- **Image provider (port)** — the interface in `providers/provider.ts`. One method,
  `generate(prompt, size)`, owning **one logical attempt** however many HTTP
  round-trips that takes (a submit-then-poll provider hides its loop behind it).
  Retry, backoff, concurrency and pacing live **above** the seam in the lane runner
  (`scripts/seed/index.ts`); the adapter only *declares* `minIntervalMs` and
  `concurrency` as data, because a throttle is cross-card scheduling that cannot
  live inside a single call.
- **Lane vs escape hatch** — the `role` field on a provider. A **lane** is in the
  default `--review` fan-out; an **escape hatch** is registered and resolvable but
  sits out the fan-out, reached only by naming it (`--providers=<id>`). Everything
  else about a hatch is identical, so a card published from one is as traceable as
  any other (`providers/index.ts`, #71).
- **Bake-off candidate** — one generated image for a `(card, provider)` pair, named
  `<theme>-<card>-<promptHash8>-<providerId>-<paramHash4>.<ext>` in `seed/review/`,
  with a `.json` **sidecar** recording the model the response actually *named*
  (`src/features/pool/review-files.ts`).
- **Provenance record** — the picked candidate's sidecar, kept after review is over
  (`seed/provenance.json`, written by `--sync`/`--publish`, `provenance.ts`, #75).
  `seed/review/` is gitignored scratch, so without this the only surviving witness of
  a shipped card is `provider` — the **lane**, which #64 proved is not the model.
  Generated and never hand-edited, unlike `seed/cards.json`. Its `model` is what the
  response *named* and is **`null`** where a provider names nothing (Cloudflare), never
  back-filled from the `params.model` that was *asked for*; its `reviewed` flag is FR9's
  durable receipt, false only on the `--allow-unreviewed` path.
- **Blank frame** — a response that is a well-formed image of *nothing*: a real,
  exactly-768×768, correctly-formatted frame carrying no subject (Cloudflare SDXL
  returned a pure black PNG for ~40% of attempts on the one prompt where it was
  measured, and never on the others tried, #78). Detected at
  the seam as an information-density floor — encoded **bytes per pixel**, no decoder
  — in `src/features/pool/blank-frame.ts`, which holds the threshold and the
  measurements that set it. Refused by `finishGeneration` as `ProviderRetryable`,
  because another attempt is a real remedy; a lane that keeps blanking exhausts the
  ordinary retry ladder and is counted by the circuit breaker like any other failure.
  The already-published pool was swept once against the same floor
  (`pnpm seed --check-images`, `blank-audit.ts`): **390 of 390 weighed, none blank**,
  2026-08-15.
- **Store budget** — how much of the plan's Blob **storage allowance** the pool has spent,
  and how many more 30-card themes fit at each lane's declared weight
  (`src/features/pool/blob-budget.ts`, `pnpm seed --blob-budget`, #79). Reads the
  STORE via `list()` rather than the pool's own image URLs, because `put()` adds a
  random suffix: re-publishing a card writes a new object and strands the old one,
  and the allowance is charged for both (**403 objects for 390 cards, 1.07 MB
  stranded**, 2026-08-15). Stranded bytes are reported, never deleted. Measured
  that day: **31.36 MB of 1 GB**, i.e. 415 more Pollinations-weight themes or 39
  Cloudflare-weight ones. The plan is **Hobby**, so exceeding an allowance is not a
  bill — it cuts off the store for the rest of the 30-day window, and a card whose
  optimized variant is not already cached then renders as its `alt` text. Covers
  **storage only**: image transformations are a deployment meter with no read path
  from the CLI, and were the tightest of them all at **2,998 of 5,000 per 30 days** —
  a dated observation, not something the command will notice moving. The ceiling is a
  **plan** fact, hardcoded, and nothing detects a plan change.
- **Mixed-weight pool** — since #79 accepted Cloudflare's weight and the map rules
  re-rendering the ~360 published cards out of scope, the pool is permanently mixed:
  light Pollinations-era cards alongside ~10× heavier Cloudflare ones. That is a fact
  about the store's growth **rate** (how fast `--blob-budget` moves) and about nothing
  a child sees, since delivered weight is decided by the optimizer either way.
- **`typicalCardBytes`** — an adapter's declared, *measured* weight for an ordinary
  768×768 card. Not in `params` and not hashed, for `minIntervalMs`'s reason twice
  over: it does not change the request, and it is an observation of the response. A
  lane nobody has weighed leaves it undefined and projects as **UNMEASURED**, the
  same discipline as a `null` `model`.
- **Delivered weight vs stored weight** — not the same number, and #79 turned on the
  difference. Every card surface renders through `next/image`, so a child downloads a
  re-encoded WebP at the requested width, never the stored bytes. Measured through the
  production optimizer at `w=512 q=75` (2026-08-15): a 937.9 KB Cloudflare PNG
  delivered **39.5 KB**, a 147.9 KB JPEG delivered **68.4 KB**, a 41.5 KB Pollinations
  JPEG delivered **9.6 KB**. Delivered weight tracks picture complexity, not source
  encoding — so a heavier lane is a *storage* question and not a child-facing
  performance one. Replicated on a second run, where the inversion held (924.7 KB →
  32.2 KB against 108.7 KB → 44.2 KB). Reproduce with `pnpm prototype:79 --delivered`
  (`scripts/prototype-79-weight/`), which also carries `--steer`: Cloudflare SDXL has
  **no output-format parameter** — `Accept: image/jpeg` and an invented
  `response_format` are both silently dropped — while
  `stable-diffusion-xl-lightning` answers **JPEG at 88–107 KB**, unregistered because
  a model swap is a roster decision (#69), not a file-size one.
- **Contact sheet** — the subject × provider grid built by `pnpm contact-sheet`
  (`src/features/pool/contact-sheet.ts`), **CHECKPOINT 2** of
  `seed/NEW-THEME-RUNBOOK.md`, where a human picks the winner per card.
- **`params`** — an adapter's declared, **total** request-parameter bag, hashed into
  the candidate filename so a parameter change invalidates exactly the reviews it
  would change. Pacing (`minIntervalMs`, `concurrency`) is deliberately excluded,
  because it does not change the bytes.
- **Adapter, disambiguated** — two families now share the word. **Persistence
  adapters** (pg + in-memory fake, one pair per Store port, above) and **provider
  adapters** (one per image provider, plus a fake in `providers/fake.ts`). Both are
  backed by a shared **contract suite** — that is the property that makes each seam
  real rather than hypothetical. The provider contract
  (`tests/contracts/image-provider-contract.ts`) runs against recorded fixtures in
  CI, and against live endpoints only via the opt-in `pnpm test:providers`
  (`tests-live/`), because live calls in CI would spend provider quota on every push.
