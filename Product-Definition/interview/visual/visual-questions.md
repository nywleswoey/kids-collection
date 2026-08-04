# Visual Sketch — Questions (5)

Progress: [□□□□□] 0/5  (~12 min remaining)

Pre-filled as before. `[from: code]` = read out of your repo · `[from: Vision]` = from vision-document.md ·
`[INFERRED]` = my judgement, check hardest.

---

## V1) Which persona(s) should the user journey follow?

(Personas were declared in the Vision Document. Pick one or more.)

A) Parent (admin)
B) Child — pre-reader (age 4)
C) Child — early reader (age 7)
D) Child — confident reader (age 9)
X) Other (describe after [Answer]:)

[Answer]:
**A + C** — two journeys.

**Why not all four**: the three children share one journey *shape* — pick profile → spend a ticket →
reveal → binder. They differ in reading level, not in flow, so three near-identical flowcharts would add
length without information. The age-7 early reader is the representative middle case: reads the
educational text (unlike the 4-year-old) without the 9-year-old's completion-optimisation behaviour.

The genuinely distinct journey is the **parent's** — sign in, unlock admin, grant tickets — which shares
no screens with the child flow except the profile picker. `[from: Vision §Target Users; INFERRED split]`

---

## V2) How deep should the user journey be?

A) Happy path only — single linear flow, ~5 nodes (~10 min)
B) Happy path + 1–2 error or alternative paths, ~8 nodes (~14 min)
X) Custom — describe after [Answer]:

[Answer]:
**B** — the alternative paths are where this product actually lives.

Two worth drawing, both from the Vision's feature list: **no tickets left** ("ask your parent" — the
moment the reward loop does its work) and the **easter-egg branch** (~1% pick-1-of-N). A happy-path-only
diagram would show a pull always succeeding, which misrepresents the core loop.
`[from: Vision §Feature Areas, FR5]`

---

## V3) What visual style should the mockups use?

A) Wireframe — boxes and labels, no color, lowest interpretation risk
B) Lo-fi styled — neutral Tailwind defaults, no brand colors
C) Branded — provide 2–3 brand colors (hex) and an optional logo URL or path

[Answer]:
**C — branded**, using the real design tokens from `app/globals.css` rather than invented colours:

| Token | Hex | Role |
|---|---|---|
| `--bg-0` | `#050310` | Galaxy base (near-black) |
| `--bg-1` / `--bg-2` | `#0b0826` / `#150f3d` | Raised surfaces |
| `--ink` | `#f7f5ff` | Text |
| `--brand-1` | `#ffd45e` | Warm gold — primary CTA, tickets |
| `--brand-2` | `#ff6fae` | Bubblegum — accents |
| `--brand-3` | `#8b5cff` | Arcade violet — glow, epic |
| `--brand-4` | `#43e6c8` | Mint pop — success/new |

**Why C over A/B here**: this is a *brownfield* sketch of a product that already exists and already has
this exact palette. A greyscale wireframe would be less faithful, not safer — the galaxy theme is
load-bearing for a 4-year-old who navigates by colour and shape rather than text.
No logo file; the wordmark renders as text. `[from: code — app/globals.css lines 12–38]`

---

## V4) What kind of sample data should appear?

A) Realistic — drawn from the Vision (product names, persona names)
B) Lorem ipsum / placeholders only — safest if the Vision is sensitive

[Answer]:
**A — realistic**, drawn from `seed/cards.json` and the Vision: real theme names (Deep Sea Creatures,
Weird Insects, Dinosaurs), real card names (Red Fox, Sea Otter), the real rarity spread
(15 common / 8 rare / 5 epic / 2 legendary per theme).

⚠️ **One deliberate exception**: **the children's real names are not used and must not appear.** They
aren't in the Vision Document — the personas are recorded by reading level, not by name — so I have
nothing to draw from, and inventing plausible child names for a kids' app artifact would be a poor idea.
Profiles render as **"Explorer 1 / 2 / 3"**. Change them if you'd prefer something else.
`[from: seed/cards.json; Vision §Target Users]`

---

## V5) Which viewport(s) should the mockups target?

A) Desktop (1280×800)
B) Mobile (390×844)
C) Both — same screens generated twice, one set per viewport

[Answer]:
**B — Mobile (390×844).**

The Vision records device use as tablet-first for the 4-year-old and tablet-or-phone for the 7-year-old;
only the parent is on "phone or laptop". Mobile is the honest primary target, and one set of screens
stays reviewable. **C would double the file count for a sketch that isn't a spec** — say so if you'd
rather have both. `[from: Vision §Target Users]`

---

Reply `ready` when all 5 answers are filled.
