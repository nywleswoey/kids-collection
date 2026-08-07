# Technical Environment — Vehicle Themes

- **Scope**: two new card categories — **Flying Machines** and **Ocean Machines**
- **Status**: Technical role complete, approved by the user 2026-08-07T10:16:22Z
- **Depth**: quick (7 CORE questions + 1 amendment resolving all three open questions)
- **Parent environment**: `Product-Definition/technical-environment.md` (approved 2026-08-03). This
  document records only the **deltas** for this feature; everything not restated here is inherited.
- **Companion**: `vision-document.md` in this folder.

> This document records constraints and decisions. It does not design the implementation.

---

## Project Technical Summary

No change to the platform. Vercel + Neon, Next.js App Router, TypeScript with `allowJs: false`,
Vitest 2 + fast-check 3, one operator with no second reviewer.

**What is actually being built here is not application code.** It is card data plus four changes to
the offline seed CLI (`scripts/seed/`, `src/features/pool/`), which is explicitly *not in the request
path*. No route, component, service, store, or migration is touched. No schema migration is required:
themes and cards are inserted through the existing idempotent write path.

The governing constraint from the parent document applies with full force: *"Prefer boring,
low-maintenance, zero-ceremony choices."* Every answer below took the smaller option where one existed.

---

## Repo Findings That Shaped These Decisions

Five facts were read out of the codebase during the interview. Two of them changed the scope.

### F1 — The reviewed image was not the published image 🔴 *(closed by T1)*

The Pollinations request carried **no `seed` parameter** `[src/features/pool/image.ts:40]`, and the
endpoint is non-deterministic. `--review` generated an image and wrote it to `seed/review/`;
`--sync` then called `generateImage` **again** and published *those* bytes
`[scripts/seed/index.ts:162-181]`.

The parent reviewed image **A**; the child received image **B**, which no human had seen. The review
pass constrained the prompt, not the picture. This has been true for all 300 existing cards, and was
survivable only because the prompts were tame and the art style consistent. The vision document's
decision to permit weapons widens exactly the variance this gap failed to catch — which is what moved
it from "latent defect" to "in scope".

### F2 — `seed-schema.ts` enforced almost no authoring rule *(closed by T2 + T3)*

The zod schema checked types, non-empty strings, the rarity enum, and `sourceUrl` being *URL-shaped*.
It did not enforce card count, the rarity pyramid, name uniqueness at any scope, `eduText` length, or
`sourceUrl` reachability. All were prose in `seed/AUTHORING_PROMPT.md` — a file that gets pasted into a
chat window.

### F3 — The Inc23 prune guard is correctly shaped *(confirmed as the stop condition, T7c)*

Pure addition means `previewPrune()` returns empty, so `--sync` needs no `--allow-prune` and triggers
no TTY confirmation `[scripts/seed/index.ts:102-120]`.

### F4 — There is still no test/lint CI *(not addressed here)*

`.github/workflows/` holds `backup.yml` only. Parent **OQ-T-2** remains open. Anything turned into a
test by this increment runs only when someone runs `pnpm test` locally.

### F5 — No usage-measurement tooling exists *(deliberately not built, T6)*

---

## Measurements Taken

Against `seed/cards.json`, 2026-08-07, before proposing the schema rules:

| Measurement | Value |
|---|---|
| Longest `eduText` across all 300 cards | **110 chars** ("World Turtle", "Kirin") |
| Cards exceeding 120 chars | **0** |
| Card names, total / unique | **300 / 300** |

Both new schema rules therefore pass on today's file with headroom. They are **forward guards, not
retro-fixes** — no existing data needs changing, and `loadSeed` will not start failing on commit.

---

## Architecture and Patterns

### The seed CLI gains four changes

All four live in `scripts/seed/` and `src/features/pool/`. All apply to **every future theme**, not
just these two.

**1. Content-addressed review filenames** *(T1, Amendment 1)*
The review key changes from `slug(theme-card)` to `slug(theme-card)-<hash8>`, where `hash8` is the
first 8 hex characters of `sha256(buildPrompt(card))`.

This makes staleness impossible **by construction**: editing an `imagePrompt` changes the hash, so
`--sync` finds no matching file and regenerates, rather than silently republishing an image that was
reviewed against the previous prompt. Rejecting an image stays "delete the file, re-run `--review`".

**2. `--sync` publishes the reviewed bytes** *(T1)*
`--sync` reuses `seed/review/<key>.jpg` when a matching file exists, generating only when it does not.
The published image is byte-identical to the reviewed one.

**3. `--sync` refuses unreviewed publishes** *(T1, Amendment 1)*
Before writing, count the cards it is about to **insert** that have no matching review file. Print
them, exit non-zero, require an explicit `--allow-unreviewed` to proceed.

This is deliberately the same shape as the existing `--allow-prune` guard, so the seed CLI has **one
consistent idiom** for "this needs a human decision".

> **Scoping detail, load-bearing:** the check applies only to cards that would actually be
> **inserted**. The 300 existing cards are skipped by `cardExists`, so they never require a review
> file and no back-fill of `seed/review/` is needed.

**4. A completeness check at the end of `--sync`** *(T7b, OQ-VT-T3)*
Asserts the published pool shape per theme, with a non-zero exit code and a per-theme report. It runs
as part of `--sync` rather than as a separate command, so it cannot be forgotten.

### Separation of concerns between the two new checks

Because the schema guarantees the *seed file* holds 30 cards in a 15/8/5/2 pyramid, any post-sync
shortfall is **by definition a failed insert, not an authoring error**:

| Check | Runs | Catches |
|---|---|---|
| `seed-schema.ts` (via `loadSeed`) | Before any write, on every seed command | **Authoring** faults — wrong count, broken pyramid, duplicate name, over-long fact |
| Completeness check | After `--sync` writes | **Publishing** faults — a card that 429'd out and never inserted |

Disjoint failure modes, no overlap.

### What is NOT changing

- No database migration. `upsertTheme` and `insertCardIfNew` handle both themes through the existing
  idempotent path.
- No application code. No route, component, service, or store is touched.
- `MAX_PULL_CATEGORIES` stays **8** (vision Q4a). The property test asserting it is unchanged.
- `loadSeed` stays a pure, synchronous, **network-free** fail-fast parser (T3).
- `resetPool()` keeps having no override parameter. Nothing here needs one.

---

## Data Patterns

### Schema validation added to `seed-schema.ts` *(T2c + Amendment 1)*

| Rule | Scope |
|---|---|
| Exactly **30 cards** per theme | Per theme |
| Exactly **15 common / 8 rare / 5 epic / 2 legendary** | Per theme |
| Card names **unique across the entire pool** | Global — not just within a theme |
| `eduText` **≤ 120 characters** | Per card |

Global uniqueness is the rule a 60-card authoring session is most likely to break by accident, and
`insertCardIfNew` would swallow the collision **silently** rather than fail — it returns `"skipped"`,
so the theme would publish 29 cards and quietly break its own pyramid.

**Not adopted:** the property-based test (T2 option d). `loadSeed` runs on every seed command and
fails fast, so the schema *is* the gate; the PBT was assurance on top of a gate that already holds.

**Accepted consequence:** the seed file can no longer be committed in a half-authored state. Reconciled
by the theme-by-theme sequencing in T7a(ii) — each theme is authored to completion before it enters
`cards.json`.

### `sourceUrl` reachability *(T3b)*

A committed **`pnpm seed --check-urls`** flag, run on demand before publishing. Not inside `loadSeed`:
putting 300+ network calls behind a synchronous parser would make every seed command slow and
network-dependent, including ones that touch no URLs. CI is the right eventual home, once parent
OQ-T-2 is closed; it is not built here.

### Theme ordering

The two new themes are **appended** to the `themes` array in `seed/cards.json`, taking the highest
`sort_order` values. Never inserted mid-array — `themes.sort_order` is a contract in the parent vision
document, and reordering reshuffles what the children already know.

---

## Security

No change to the security posture. This increment touches no authentication, no authorization, no
secret, and no client-facing surface.

- **Credentials**: `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` from `.env.local`, as today. No new
  secret is introduced — which is one of the reasons T6 chose manual measurement over a committed
  usage script that would have needed Vercel and Neon API credentials in env.
- **Production exposure**: `.env.local` holds the production `DATABASE_URL`, so `pnpm seed --sync`
  hits production by default. This is unchanged and is why the Inc23 guards exist.
- **Content safety** is the security-adjacent concern here, and it is now mechanically held rather
  than merely asserted — see the `--allow-unreviewed` guard above.

---

## Testing

Inherited bar from the parent document: *every invariant that protects the children's data must be
covered by a property-based test or a contract test.* No numeric coverage target.

| Item | Test position |
|---|---|
| The four schema rules | Enforced by `loadSeed` on every seed command; fail-fast before any write. **No PBT** (T2, option d declined) |
| Completeness check | Runs in-band at the end of `--sync`, non-zero exit on shortfall |
| `--allow-unreviewed` guard | Follows the existing `--allow-prune` pattern; that pattern's guard logic already has test precedent from Inc23 |
| `MAX_PULL_CATEGORIES = 8` | Existing `tests/pull-categories.pbt.test.ts:74` assertion stays green — the constant does not change |

**Not required**: end-to-end, performance, SAST/DAST — unchanged from the parent document.

**Enforcement caveat (F4)**: with no test CI, all of the above runs only when invoked locally. This
increment does not close parent OQ-T-2.

---

## Operational Runbook

### Authoring *(T4: b + c)*

Author **in-repo** against `seed/cards.json`, with all 300 existing cards visible. The hardest
authoring constraint is *"not already used by a card in any other theme"*, and a claude.ai session
cannot see the file — it is being asked to avoid collisions with 300 names it has never read.

The merge is gated by the T2 schema and the T3 URL check before commit.

`seed/AUTHORING_PROMPT.md` is edited **first** (vision scope item 9), carrying two changes:
1. The new global content rule — weapons permitted, gore and violence prohibited.
2. The **2–3 military subjects per theme** cap *(T5c)*.

### The military cap *(T5c)*

Human review, with the cap declared in the authoring prompt so the session self-limits. **No
`"military": true` seed field.** "Military" has no crisp boundary — a Coast Guard rescue helicopter, a
research vessel on a naval hull, a museum carrier — and a schema flag would force a binary judgement
on a genuinely fuzzy category, then enforce it with false precision.

### Publish sequence *(T7a-ii)*

Theme by theme, not both at once:

```
edit AUTHORING_PROMPT.md          # once, first
  ↓
author Flying Machines (30)  →  schema passes  →  --check-urls passes
  ↓
pnpm seed --review           →  eyeball 30 images (kid-safety + weapons/gore boundary)
  ↓
pnpm seed --sync             →  publishes the reviewed bytes; completeness check must pass
  ↓
repeat for Ocean Machines
```

Each review sitting stays at 30 images (matching the Business role's Q7b-ii), and a problem found in
the first theme is fixed before the second is authored.

### Failure handling

| Situation | Response |
|---|---|
| A card 429s out and is skipped | **Re-run `--sync`.** Idempotent; inserts only what is missing |
| Completeness check fails (theme short) | **Re-run `--sync`.** Never prune, never reset. A short theme is **not data loss** — no child loses anything; the only consequence is that (theme, rarity) set-completion is unreachable until it is fixed |
| `--sync` reports a pending prune, or asks for a typed collection-row count | **STOP.** Do not type the number, do not pass `--allow-prune`. That prompt can only mean something was renamed or dropped in the seed file. Fix the file |
| `--sync` reports cards with no reviewed image | **STOP.** Run `--review` first. `--allow-unreviewed` exists but defeats the invariant |

### The OQ-B-2 runway measurement *(T6a)*

**Manual.** Read Vercel Blob storage and Neon row counts from the dashboards before and after, and
record both figures plus the derived per-theme cost in the increment document.

Deliberately *not* a committed script, which is the opposite of the T3 answer. The difference: this is
a **two-point measurement of a question that closes**, not a check that repeats every theme. Once you
have the number, the extrapolation is arithmetic (~5 MB and 60 rows per theme). A script would need
Vercel and Neon API credentials in env — new secrets and a new failure mode for a figure read twice.
If the answer turns out to be tight, a script plus a documented threshold becomes worth building then.

---

## Open Questions

**None outstanding.** All three pre-declared technical open questions were resolved inside the
approval loop:

| ID | Question | Resolution |
|---|---|---|
| OQ-VT-T1 | `seed/review/` is untracked and staleness-prone, yet T1 makes it the source of published bytes | Content-addressed filenames + the `--allow-unreviewed` guard. Machine-local exposure accepted and documented |
| OQ-VT-T2 | `eduText` ≤120 unenforced | `.max(120)` in the schema; verified safe against existing data |
| OQ-VT-T3 | Remedy undefined if the post-sync completeness check fails | Re-run `--sync`; never prune; a short theme is not data loss |

**Accepted, not resolved** — recorded so it is not rediscovered as a surprise:

- The reviewed bytes live in a **gitignored, machine-local** directory (`/seed/review/` in
  `.gitignore`, 0 tracked files). Review and publish therefore cannot be separated across machines.
  Acceptable: one operator, one machine.
- Parent **OQ-T-2** (no test CI) is untouched by this increment.

---

## What Must NOT Change

- **`loadSeed` stays pure, synchronous, and network-free.** The URL check is a separate flag for this
  reason.
- **The `--allow-*` idiom.** Destructive or invariant-defeating operations get an explicit named flag,
  a printed blast radius, and a non-zero exit by default. `--allow-prune` and `--allow-unreviewed` must
  stay consistent with each other; a future third guard should follow the same shape.
- **The review→publish byte identity.** Once T1 lands, `--sync` publishing a freshly-generated image
  for a card that has a matching review file is a regression, not an optimisation.
- **The completeness check runs in-band.** Moving it to a separate opt-in command re-creates the
  "silent short theme" failure it exists to prevent.
- **Themes are appended, never inserted.** `themes.sort_order` is a contract.
- **No new secret in env** for tooling that only reports numbers.
