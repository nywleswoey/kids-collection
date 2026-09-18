# INCREMENT 24 — Build & Test: Vehicle Themes

**Status**: DONE — published to production 2026-08-07. Awaiting approval to proceed to Operations.
**Date**: 2026-08-07
**Design**: `aidlc-docs/inception/application-design/increment24-vehicle-themes-design.md` (D1–D7 = A)

**Gate results**: `pnpm typecheck` clean · **275/275** unit tests · `pnpm build` ✅ ·
`pnpm seed --check-urls` **360/360 → 200** · `pnpm seed --sync` **60 inserted / 0 failed / 0 pruned** ·
completeness **all 12 themes published in full**

---

## 1. Publish result

```
Seed (sync) complete: {
  inserted: 60, updated: 300, skipped: 0, failed: 0,
  reviewed: 0, reused: 60, prunedThemes: 0, prunedCards: 0
}
✓ completeness: all 12 theme(s) published in full.
```

- **`reused: 60`** — every one of the 60 cards published the bytes already on disk. `generateImage` was
  not called once during `--sync` (FR8 / NFR9).
- **`prunedThemes: 0, prunedCards: 0`** — purely additive, exactly as NFR3 requires. `--allow-prune`
  was never needed and never passed; neither was `--allow-unreviewed`.
- **`updated: 300`** — the existing pool got its text refreshed, no image touched.

### FR8 verified end-to-end against production

Every published image was fetched back from its Blob URL and hashed against the reviewed file on disk:

> **60/60 byte-identical, 0 mismatched.**

The review→publish byte identity is now demonstrated, not asserted.

### Production state after sync

| Check | Value |
|---|---|
| Themes | **12** |
| Cards | **360** |
| Themes holding exactly 30 cards | **12/12** |
| Cards with no `imageUrl` | **0** |
| `collections` rows | 645 → **666** |

`collections` **rose** by 21 — the children pulled cards while this increment was in progress. No row
was lost (AC26).

---

## 2. FR21 — Free-tier runway (parent OQ-B-2)

Read directly from production with the existing credentials; **no new secret, no committed script**
(T6a).

| | Before | After | Δ |
|---|---|---|---|
| Neon rows (`themes`+`cards`+`collections`) | 955 | 1038 | +83 |
| — of which `cards` | 300 | **360** | **+60** |
| Blob objects | 313 | **373** | **+60** |
| Blob bytes | 26,713,154 (25.48 MB) | 29,665,383 (**28.29 MB**) | **+2.81 MB** |

### Per-theme marginal cost

**≈1.4 MB of Blob and 30 Neon rows per theme.**

Lower than the vision's ~2.5 MB/theme estimate: the 60 new images average **47 KB** against the
existing pool's **83 KB**, because the new prompts produce flatter, less textured art. Taking the
older, more expensive figure as the conservative case gives **≈2.5 MB/theme**.

### ✅ Answer to OQ-B-2 — *does the $0/month target survive an ever-growing card pool?*

**Yes, with room that is not the binding constraint.**

Vercel Blob's free tier is 1 GB. At 28.29 MB used, roughly **995 MB remains** — between **400 themes**
(at the conservative 2.5 MB) and **700 themes** (at the measured 1.4 MB). Neon's free tier is bounded
by storage rather than rows, and 1,038 rows of short text is nowhere near it.

The pool would have to grow **thirty-fold** before storage cost anything. Whatever eventually limits
this project, it is not the free tier — the real limits are the parent's authoring time and the
children's appetite. **OQ-B-2 can be closed.**

### Finding — 13 orphaned Blob objects (unchanged, pre-existing)

373 objects for 360 cards, exactly as it was 313-for-300 before. **The sync created no new orphans.**
`uploadImage` writes before `insertCardIfNew`, so a card uploaded and then not inserted — or later
deleted, as Increment 20's Zombie was — leaves its object behind. Never referenced by
`cards.image_url`; costs only storage, and at 13 objects that is under 1 MB. Recorded, not addressed.

---

## 3. ⚠️ Correction — Pollinations is deterministic

The feature's `technical-environment.md` (F1) states the endpoint *"is non-deterministic"*, and that
claim is the foundation of the whole review→publish argument. **It is wrong.**

Measured directly: the same prompt requested twice returned **the identical sha256** (36,849 bytes,
`3a6a66a4…` both times). Discovered by accident when a rejected image was re-rolled and came back
pixel-identical.

**What this changes:**

- The reject loop as originally documented — *"delete the file from `seed/review/` and re-run
  `--review`"* — **does not work**. It regenerates the picture you just rejected. Rejecting requires
  **changing the `imagePrompt`**. `seed/AUTHORING_PROMPT.md` has been corrected.
- F1's severity is **overstated**. It said the parent reviewed image A while the child received image
  B, *"true for all 300 existing cards."* Since `--review` and `--sync` sent identical prompts, they
  received identical bytes. The gap was real only in two narrower cases.

**What this does not change — FR7 and FR8 remain justified**, for the two cases that survive:

1. **An edited `imagePrompt`.** Under the old `slug(theme-card)` naming the filename did not depend on
   the prompt, so an edited prompt still matched the old file and `--sync` republished an image
   reviewed against a prompt that no longer existed. Content-addressing (FR7) closes this, and it is
   the case this increment actually hit — three times, editing prompts for the Harrier, the SR-71 and
   Solar Impulse 2.
2. **An upstream model change.** Determinism holds for *today's* Pollinations. Nothing contractually
   binds it; the service can update its model at any time, after which every previously-reviewed prompt
   yields new bytes. FR8 makes that irrelevant by publishing bytes rather than prompts.

The invariant is worth holding mechanically either way. What changes is the *story*: this was a latent
fragility, not an active breach.

---

## 4. Content review (FR17)

All 60 images generated and reviewed by the parent; **no rejections** at the final pass.

| | Flying Machines | Ocean Machines |
|---|---|---|
| Cards | 30 (15/8/5/2) | 30 (15/8/5/2) |
| Military subjects | **2** — Supermarine Spitfire, Harrier Jump Jet | **2** — Aircraft Carrier, USS Nautilus |

Both under the 2–3 cap. Research submersibles (Alvin, Trieste, Bathysphere, Deepsea Challenger)
correctly do **not** count against it — the split the vision carried forward as an assumption, applied
here for the first time and found workable.

No `imagePrompt` depicts firing, burning, sinking or destruction: the Spitfire is *parked on grass with
its propeller still*, the Harrier *hovering above an empty airfield*, the carrier has *a long flat empty
deck*. Every `eduText` is engineering, exploration or history — the carrier's is about steam catapults,
the Nautilus's about reaching the North Pole under the ice.

### Image-generation findings

- **Ships and rockets render reliably.** The Aircraft Carrier, Gondola and Saturn V needed no retries.
- **Sleek aircraft in flight are the failure mode.** Five renders came back as two fused copies of the
  subject. `side view` plus `a single …` plus a plain ground setting helps but does not guarantee it.
- **SR-71 Blackbird was dropped after three failures** (two malformed; the third safe but sporting a
  propeller, on a jet whose fact is about friction heating). **Replaced by Solar Impulse 2** — a better
  fact for a 7-year-old, a simpler shape, and one fewer military subject.

### `--check-urls` earned its place twice

- The **first build of the checker** reported ~100 failures against the real file, every one a `429`.
  Rate limiting is not rot; see the code summary §4.
- The **rebuilt checker** passed all 360 including three deliberately parenthesised Wikipedia titles
  (`Lifeboat_(rescue)`, `USS_Nautilus_(SSN-571)`, `Trieste_(bathyscaphe)`) — precisely the pattern the
  authoring prompt warns 404s.

---

## 5. FR10 validated against production, unplanned

The review pass is the cleanest evidence in the increment:

| Run | Result |
|---|---|
| First `--review` (Flying Machines) | **skipped 300**, reviewed 27, failed 3 (Pollinations 429) |
| Second `--review` | skipped 327, **reviewed exactly the 3** that failed, failed 0 |
| `--review` (Ocean Machines) | skipped 330, reviewed 30, failed 0 |

Before this increment the same command would have regenerated **all 330**, at roughly 18 minutes of
throttle alone. A rate-limited run now resumes instead of restarting.

---

## 6. Outstanding

- **Operations gate** — push to `main` → Vercel prod. The 60 cards are **already live to the children**
  (they went live the moment `--sync` wrote Neon); the deploy ships the CLI changes, the seed file, the
  authoring prompt and these docs.
- **§8 write-backs** to `Product-Definition/` — six deltas, including closing OQ-B-2 with the number
  above and correcting the F1 determinism claim.
- **Visual check on a signed-in child profile** not done (needs a Google-authenticated session).
- Parent **OQ-T-2** (no test CI) and **OQ-CS-3** untouched.
