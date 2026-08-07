# Technical Interview (Vehicle Themes) — Batch 1 of 1: all 7 CORE questions

Progress: `░░░░░░░░░░` 0/7 questions  ·  ~8 min

Depth is `quick`, so this is the only Technical batch. Fill in the `[Answer]:` tags below, then reply **"ready"**.

> Business role is complete and approved — see `vision-document.md`.
> Nothing from that batch can be lost; it is saved in `../business/vision-answers-history.md`.
> This role is single-writer on `state/technical-state.md`.

Tags: `[from: code]` = read out of the repo just now · `[INFERRED]` = check this hardest.

---

## Constraints carried in — not up for re-decision here

From the parent `technical-environment.md` (approved 2026-08-03) and this feature's vision document:

- **One person, no second reviewer, no ops function.** The parent doc's governing rule: *"Prefer boring,
  low-maintenance, zero-ceremony choices."*
- **Strictly $0/month.** Pollinations anonymous tier; free Vercel Blob and Neon.
- **TypeScript only**, `allowJs: false`. Vitest 2 + fast-check 3.
- **Property-based tests are REQUIRED and BLOCKING** for any invariant that protects the children's
  data. Coverage bar is behavioural, not a percentage.
- **The pool write path is additive.** No prune, no `--allow-prune`, no `resetPool()`.
- **`themes.sort_order` is a contract** — the two new themes are appended, never inserted.
- **No unreviewed content path to a child, ever.**

---

## Repo facts I checked just now, so you don't have to

### F1 — The image you review is **not** the image the children get 🔴

This is the finding that matters most, and it makes scope item 5 currently decorative.

The Pollinations request is `…/prompt/<text>?width=768&height=768&nologo=true` — **no `seed`
parameter** `[from: src/features/pool/image.ts:40]`. The endpoint is non-deterministic: the same prompt
returns a different picture every call.

Now trace the two modes `[from: scripts/seed/index.ts:162-181]`:

- `--review` → `generateImage(...)` → writes bytes to `seed/review/<key>.jpg` → **returns**.
- `--sync` → `generateImage(...)` **again** → uploads *those* bytes to Blob → inserts the card.

So the parent eyeballs image **A** and the child receives image **B**, which no human has ever seen.
The review pass constrains the *prompt*, not the *picture*. This has been true for all 300 existing
cards; it has been survivable because the prompts are tame and the art style is consistent. The vision
document just made weapons permissible, which widens exactly the variance this gap fails to catch.

### F2 — `seed-schema.ts` enforces almost none of the authoring rules

The zod schema checks types, non-empty strings, a valid rarity enum, and `sourceUrl` being
*URL-shaped* `[from: src/features/pool/seed-schema.ts]`. It does **not** enforce:

| Rule (prose only, in `seed/AUTHORING_PROMPT.md`) | Enforced by |
|---|---|
| 30 cards per theme | Nothing |
| 15 common / 8 rare / 5 epic / 2 legendary | Nothing — and set-completion depends on it |
| Card names unique **within** a theme | Nothing (a DB insert would silently skip via `cardExists`) |
| Card names unique **across all themes** | Nothing |
| `sourceUrl` actually resolves (200) | Nothing — `.url()` is format-only |
| `eduText` ≤ ~120 chars | Nothing |

Scope items 3 and 4 are therefore manual re-checks of rules a machine could hold permanently. This is
the cheapest moment to decide which of them become code.

### F3 — The Inc23 prune guard is correctly shaped for this run

Pure addition means `previewPrune()` returns empty, so `--sync` needs no `--allow-prune` and triggers
no TTY confirmation `[from: scripts/seed/index.ts:102-120]`. **If it does prompt you, the seed file is
wrong** — a renamed or dropped theme/card — and the correct response is to stop, not to type the number.

### F4 — There is still no test/lint CI

`.github/workflows/` now contains `backup.yml` only (Inc23's nightly backup). The parent doc's
**OQ-T-2** — *"CI gates are declared but not enforced"* — is still open. Anything you turn into a test
here runs only when someone runs `pnpm test` locally.

### F5 — No usage-measurement tooling exists

Nothing in the repo reads Blob storage size or Neon row counts. Inc23 set a precedent by committing
`scripts/backup/verify.ts` rather than leaving verification manual.

---

## Question T1 [CORE]: Close the review→publish gap (F1), or accept it?

The vision document's binding invariant is *"no unreviewed content path to a child, ever."* F1 says
that invariant is not actually held by the code today.

a) **Publish the reviewed bytes.** `--sync` reuses `seed/review/<key>.jpg` when it exists, and only
   generates when it doesn't. The published image is byte-identical to the reviewed one.
b) **Pin a `seed` parameter** on the Pollinations URL, derived from the card key, so review and sync
   request the same deterministic image.
c) **Review after publish** — sync first, eyeball the live cards, delete and regenerate the rejects.
d) **Accept it.** The prompt is the real control; the art style makes bad output unlikely.
e) Other

**Recommendation:** **(a)**, and treat it as in-scope for this increment rather than a follow-up.
It is a handful of lines in one file, needs no new dependency, and converts the review pass from a
gesture into the guarantee the vision document already claims. (b) is smaller still but rests on
Pollinations honouring `seed` determinism indefinitely — an external promise you can't test once and
rely on forever. (c) inverts the invariant: the child can reach the card before the parent has seen it.
(d) was defensible for ten themes of animals and plants; it is a worse bet now that weapons are allowed.

Note this is a change to shared seed tooling, so it lands for all future themes, not just these two.

[Answer]: a

---

## Question T2 [CORE]: Which authoring rules become schema validation (F2)?

Every rule in the table above is currently prose in a file that gets pasted into a chat window.

a) **None** — keep them prose; the manual checks in scope items 3 and 4 are enough for 60 cards.
b) **Shape only** — `seed-schema.ts` enforces 30 cards per theme and the exact 15/8/5/2 pyramid.
c) **Shape + uniqueness** — as (b), plus card names unique across the entire pool.
d) **(c) plus a property-based test** asserting the invariants hold for any valid seed file.
e) Other

**Recommendation:** **(c)**, with (d) if you want it belt-and-braces. The pyramid is named in the vision
document's "What Must NOT Change" and set-completion breaks permanently if a theme deviates — that is
exactly the class of invariant the parent doc says must be mechanically held, not documented. Global
name uniqueness is the one a 60-card authoring session is most likely to violate by accident
("Albatross" already exists in Animals), and `insertCardIfNew` would swallow the collision silently
rather than fail. On (d): `loadSeed` runs on every seed command and fails fast, so the schema *is* the
gate; a PBT adds assurance but the schema is what stops a bad publish.

Caveat worth naming: making the pyramid a hard schema rule means the seed file cannot be committed in a
half-authored state. Say so if you'd rather author incrementally and check at the end.

[Answer]: c

---

## Question T3 [CORE]: Where does the `sourceUrl` 200-check live?

60 URLs, and the authoring prompt already warns that parenthesised Wikipedia suffixes 404.

a) **Throwaway** — a one-off script or shell loop, not committed.
b) **Committed CLI flag** — `pnpm seed --check-urls`, run on demand before publishing.
c) **Inside `loadSeed`** so every seed command verifies them.
d) **In CI**, once CI exists (OQ-T-2).
e) Other

**Recommendation:** **(b)**. (c) is wrong on principle — `loadSeed` is a pure, synchronous, fail-fast
parser and putting 300+ network calls behind it makes every seed command slow and network-dependent,
including ones that touch no URLs. (a) means the next theme re-solves it. (d) is the right *eventual*
home but CI doesn't exist yet and this increment isn't the place to build it. (b) is one committed
script that pays off from the twelfth theme onward, matching the `scripts/backup/verify.ts` precedent.

[Answer]: b

---

## Question T4 [CORE]: Where does the card authoring actually happen?

`AUTHORING_PROMPT.md` says: paste the box into claude.ai, merge the returned JSON by hand. That was
written for a theme at a time; you now need 60 cards across two sessions.

a) **Status quo** — paste into claude.ai, hand-merge the JSON into `seed/cards.json`.
b) **In-repo with Claude Code** — author directly against `seed/cards.json`, with the existing 300
   cards visible for the collision check.
c) **Generate, then mechanically validate** — either of the above, but the merge is gated by T2's
   schema and T3's URL check before commit.
d) Other

**Recommendation:** **(b) combined with (c)**. The single hardest authoring constraint is
*"not already used by a card in any other theme"*, and the claude.ai session cannot see
`seed/cards.json` — it is being asked to avoid collisions with 300 names it has never read. Authoring
in-repo removes the guesswork entirely, and (c) makes the outcome checkable rather than trusted.
Whichever you pick, `AUTHORING_PROMPT.md` needs its content-rule edit either way (vision scope item 9).

[Answer]: b, c

---

## Question T5 [CORE]: How is the 2–3 military cap enforced?

The vision document caps military subjects at 2–3 per theme and permits visible weaponry while
prohibiting gore and violence. Right now that is a sentence in a document.

a) **Human review only** — the parent counts them during the `--review` pass.
b) **Seed metadata** — an optional `"military": true` flag per card, with a schema rule capping the
   count per theme. Machine-enforced, and self-documenting in `cards.json`.
c) **Human review, but write the cap into `AUTHORING_PROMPT.md`** so the authoring session self-limits.
d) (b) + (c) — declared in the prompt, enforced by the schema.
e) Other

**Recommendation:** **(c)**, and resist (b)/(d) unless you want it. "Military" has no crisp boundary —
a Coast Guard rescue helicopter, a research vessel built on a naval hull, a retired carrier serving as a
museum — and a schema flag forces a binary judgement at authoring time on something genuinely fuzzy,
then enforces it with false precision. The cap's real purpose is to stop a 30-card list drifting into a
weapons catalogue, and the authoring prompt is where that steering actually happens. It is also a
seed-file-only concern; nothing downstream reads it.

[Answer]: c

---

## Question T6 [CORE]: How is the OQ-B-2 runway number produced?

Scope item 8: Blob GB and Neon rows before and after, plus "how many more themes fit".

a) **Manual** — read the Vercel and Neon dashboards, write the numbers into the increment doc.
b) **Committed script** — `scripts/usage/report.ts`, following the `scripts/backup/verify.ts`
   precedent, re-runnable at any pool size.
c) **Script + a documented threshold** — as (b), plus a stated "stop and re-plan at N%" line.
d) Other

**Recommendation:** **(a)**, which is not where I landed on T3 — the difference is that this is a
**two-point measurement of a question that closes**, not a check that repeats every theme. OQ-B-2 asks
for a number; once you have it, the extrapolation is arithmetic you can redo in your head (~5 MB and 60
rows per theme). A committed script would need Vercel and Neon API credentials in the repo's env to
read usage — new secrets, new failure mode, for a figure you'll look at twice. If the answer turns out
to be *"you have room for 3 more themes"*, then (c) becomes worth building; it is a poor bet before
you know the number.

[Answer]: a

---

## Question T7 [CORE]: Publish mechanics against production

The seed run is the only step that touches prod. `.env.local` holds the production `DATABASE_URL`, so
`pnpm seed --sync` hits prod by default.

**a) Order.** (i) Author both themes → review all 60 → one `--sync`. (ii) Theme by theme: author,
review, sync, then repeat. (iii) Other.

**b) Failure handling.** A 429-exhausted card is skipped, not published, and the run is idempotent —
re-running picks up only what's missing. Is "re-run until the inserted count reaches 60" your intended
procedure, or do you want a completeness check that fails loudly if the pool ends up short?

**c) The stop condition.** Confirm: if `--sync` reports a pending prune or asks you to type a
collection-row count, the run **stops** and the seed file gets fixed — that prompt can only mean
something was renamed or dropped.

**Recommendation:** **a(ii)** · b: **add a completeness check** · c: **confirm**. Theme-by-theme keeps
each review sitting to 30 images, which is what Q7b(ii) in the Business role already chose, and it means
a problem found in Flying Machines is fixed before Ocean Machines is authored. On (b): the seed script
reports `failed` counts but nothing asserts the final pool shape, so a partially-published theme —
28 of 30 cards, pyramid broken, set-completion quietly unreachable — is a silent outcome today. If T2(b)
or (c) is adopted, this is nearly free: run the same shape assertion against the database after sync.

[Answer]: follow recommendation

---

When all seven are filled in, reply **`ready`**.
