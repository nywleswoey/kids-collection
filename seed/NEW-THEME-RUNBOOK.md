# Runbook — add a new theme (category)

**Audience: an agent.** You are handed one thing — a theme name — and you drive the whole category into
the live pool: choose the 30 subjects, author the JSON, validate it, generate the art, screen it, get one
human approval, publish, and open a PR.

This file supersedes the old `seed/AUTHORING_PROMPT.md`. It is the only card-authoring document.

**Invocation:** _"Add the theme **Ocean Machines** using `seed/NEW-THEME-RUNBOOK.md`."_

## Contract

| | |
|---|---|
| **Input** | A theme name. Nothing else. Any extra steer from the human (e.g. "lean historical") overrides this document's defaults where they conflict. |
| **Output** | 30 published cards, images reviewed, the winning provider recorded in `seed/cards.json`, committed on a branch, a PR open. |
| **Human checkpoints** | Exactly **two**: the 30-name list (Step 3), and the image contact sheet (Step 7). Still two — the bake-off did **not** add a third; it changed what the second one *is*, from approve/reject to **choose among N candidates**. Stop dead at both — do not proceed on silence, and never answer them yourself. |
| **Blast radius** | `pnpm seed --sync` writes to the **production** Neon DB and Blob store that the children play against. `--check-urls` and `--review` do not write to it. |
| **Session** | One theme per run. Do not batch two themes. |

## Rules the schema enforces

`src/features/pool/seed-schema.ts` runs on **every** `pnpm seed` command and fails the whole file, so a
half-authored theme cannot be committed or published. You do not get to "fix it later":

1. **Exactly 30 cards** per theme.
2. **The rarity pyramid, exactly: 15 common / 8 rare / 5 epic / 2 legendary.** Every theme has this
   shape — set-completion rewards, the rarity filters, sacrifice and rarity-pick tickets all assume it.
   An off-pyramid theme breaks the symmetry permanently.
3. **Card names unique across the entire pool**, not just within the theme. This is the rule a long
   authoring session breaks by accident, and the one with no other backstop.
4. **`eduText` ≤ 120 characters**, `sourceUrl` a well-formed URL.

Reachability of `sourceUrl` is *not* schema-checked — that is `--check-urls` (Step 5).

---

## Step 1 — Branch

```bash
git checkout -b theme/<theme-slug>
```

Work here for the rest of the run. Never author on `main`.

## Step 2 — Read the pool before you invent anything

```bash
node -e "const d=require('./seed/cards.json');console.log(d.themes.map(t=>t.name).join('\n'))"
node -e "const d=require('./seed/cards.json');console.log(d.themes.flatMap(t=>t.cards.map(c=>c.name)).sort().join('\n'))"
```

The second command is the collision list — every card name already taken. Read it. A near-miss is also a
fail in spirit: if "Giant Squid" exists, do not add "The Giant Squid".

**Abort and report** if the requested theme duplicates or heavily overlaps an existing one (a "Sea Life"
theme against the existing *Deep Sea Creatures* and *Ocean Machines*). Overlap is a human decision, not
one you route around by picking weirder subjects.

## Step 3 — Choose 30 subjects and assign rarity → **CHECKPOINT 1**

### The rarity rubric

Rarity is about **stature within the theme**, not difficulty of the fact. Read down:

| Rarity | Count | What earns it | From the existing pool |
|---|---|---|---|
| **legendary** | 2 | The apex of the theme — the singular, the first, the record-holder, or the one icon that *defines* the category. A child should feel the theme has been completed by owning it. | Wright Flyer, Voyager 1 · Trieste, Seawise Giant · Pando, Wollemi Pine · Tyrannosaurus rex, Argentinosaurus · Coelacanth, Megamouth Shark |
| **epic** | 5 | Famous and impressive — the ones a child actively *chases*. Big, dramatic, well-known, but not the theme's summit. | Saturn V, Space Shuttle, Concorde · Giant Squid, Colossal Squid · Corpse Flower, Giant Sequoia |
| **rare** | 8 | Recognisable but not household. The interesting middle: a child may have heard of it, and learns something by getting it. | Seaplane, Airship, Harrier Jump Jet · Luna Moth-tier insects |
| **common** | 15 | The everyday backbone of the theme. Instantly recognisable, unremarkable to own — these are what a child pulls constantly and what makes the set feel *buildable*. | Helicopter, Hot Air Balloon, Drone · Red Fox, Honey Bee |

Extra guidance the pool bears out:

- **Vary the flavour of the two legendaries.** Existing pairs mix *oldest/first* with *biggest/farthest*
  (Wright Flyer + Voyager 1; Trieste + Seawise Giant). Two of the same kind wastes the slot.
- **Spread the 30 across the theme's sub-territories** so the common tier isn't fifteen near-identical
  things. *Flying Machines* covers balloons, gliders, airliners, rotorcraft, spacecraft.
- **A card is a subject you can photograph, not a concept.** "Aerodynamics" is not a card.

### Content rules — every theme, every rarity

- **Weapons and military hardware are permitted.** A fighter's guns, a carrier's deck, a submarine's
  torpedo tubes, a knight's sword — visible weaponry on any subject is fine.
- **Gore and violence are prohibited.** Nothing firing, attacking, burning, sinking, exploding or being
  destroyed. No blood, wounds, injury or casualties. No combat scenes. The subject sits still and is
  looked at.
- **Non-scary and kid-friendly, in full.** Steer spooky subjects cute or comical — a smiling vampire, a
  clumsy zombie.
- **At most 2–3 military subjects per theme.** A *military* submarine counts against the cap; a
  *research* submersible (Alvin, Trieste) does not. Judge by what the subject is for.
- **`eduText` covers engineering, exploration, nature, story or history — never combat.** Not what a
  thing destroyed; what it *is*, or what it *reached*.

### The checkpoint

Present the human a plain list — 30 names grouped by rarity, one line each with a three-to-six word
reason for the tier. No JSON yet. Then **stop and wait.** Authoring 30 eduTexts and sourceUrls against a
subject list the human would have rewritten is the single biggest waste in this runbook.

## Step 4 — Write the JSON

Card shape (all five fields required):

```json
{
  "name": "Concorde",
  "rarity": "common|rare|epic|legendary",
  "eduText": "one true, simple, kid-friendly fact, <= 120 chars",
  "imagePrompt": "short concrete description of the subject only",
  "sourceUrl": "https://en.wikipedia.org/wiki/Concorde"
}
```

A sixth field, `provider`, is optional and is **not** authored here: it records the bake-off winner and is
added at Step 6, on the theme and — sparsely — on individual cards.

- **Theme name** — short, title-case, matching the existing set (*Animals*, *Mythic Creatures*,
  *Dinosaurs*, *Superheroes*, *Country*, *Famous People*, *Weird Insects*, *Special Plants*,
  *Spooky Legends*, *Deep Sea Creatures*, *Flying Machines*, *Ocean Machines*).
- **`eduText`** — true, simple, readable by a 7-year-old, ≤ 120 chars. For **fictional** subjects the
  fact is about the *story or folklore* ("Mary Shelley wrote Frankenstein at 18…") — never present
  fiction as fact.
- **`sourceUrl`** — a real, resolvable URL backing the fact. Wikipedia is fine. Parenthesised suffixes
  often 404; Step 5 catches it.
- **`imagePrompt`** — concrete, kid-friendly, **no art-style words**: `buildPrompt()` appends `ART_STYLE`
  for you. What works across every provider: name **one** subject ("a single …"), give a viewpoint ("side
  view"), put it somewhere plain ("parked on grass"). Sleek aircraft photographed in flight are the shape
  most often rendered as two overlapping copies. Name **no object the picture sits inside** — card,
  frame, border, poster, sticker, mat. Cloudflare's SDXL draws those literally and insets the real subject
  within them; that was #81, and it came from `ART_STYLE` saying "trading-card" rather than from any
  card's own wording.

### What the providers can and cannot draw

Read this **before** you pick subjects, not after — some of it is a constraint on Step 3, not on your
wording. It is written **per provider**, because they do not fail the same way. There is no such thing as
"the image model" here any more: Step 6 draws every card on every lane and a human picks (#63).

The failure classes below were learned the hard way on *Warriors*, where a Pollinations-only pass returned
3 usable images out of 28. #66 re-ran three of those cards through the shipped seam on both lanes, and #74
ran them through the escape hatch. What survives is narrower than the old blanket claim:

| Failure class | `pollinations` (asks for `flux`, served by `sana` — #64) | `cloudflare-sdxl` | `ai-horde` (escape hatch) |
|---|---|---|---|
| Identity rests on a **small held object** — bow, spear, tool | **fails** — the object goes wire-thin, smears, or duplicates | **fails** — right style, still draws two bows | **the one it fixes** — #74's single bow, single arrow: the first usable Longbowman this project has had |
| Identity rests on **niche uniform accuracy** | **fails** — a plausible costume from the wrong century or country, or a photoreal toddler in fancy dress | **usually passes** — #66 drew the Swiss Guard's blue/yellow stripes and ruff correctly; #74 saw a generic modern uniform on a different sample, so treat it as *much better, not reliable* | **fails differently** — costume correct, but rendered photo-real, which loses `ART_STYLE` |
| **Multi-object scene** — a rider and a vehicle, a crowd | **fails** — the parts recombine into something else (a Victorian pony-trap for an Egyptian chariot; one figurine for the Terracotta Army) | **passes** — two horses, gold chariot, nemes headdress; rows of clay soldiers in a trench | **best seen for the class**, but miscounts (one horse where the prompt says two) |

**What that means for Step 3.** Niche uniforms and multi-object scenes are **no longer disqualifying** —
a theme that needs them is viable, on the Cloudflare lane. **Small held objects still are**: both lanes fail
them, and the two answers are cheap-then-expensive — drop the object and let clothing carry the subject
(the wording lever below), or reach for the escape hatch at 30–45 minutes per image. Budget one or two such
cards per theme, not fifteen.

`ART_STYLE` asks for a bright cartoon, and **the lanes do not agree about what they are drawing**:
Cloudflare renders bright cartoon, `sana` renders painterly semi-realism on *every* subject, and the horde's
model drifts photo-real on costume subjects. So a picture that looks wrong in style is usually the wrong
lane rather than the wrong words. Long, photo-real prompts make it worse everywhere. The prompts that land
look like the ones already in `cards.json`: a short noun phrase, **one** cheerful subject, outdoors in
daylight, **at most one** held object.

Wording levers, in the order worth trying — these apply to every provider:

- **Lead with the defining object** when a subject needs one — "a tall wooden longbow held upright by a
  cheerful archer…" beats "an archer holding a longbow". It moves the odds; it does not fix the class.
- **Drop the weapon entirely** and let clothing carry the subject. This rescued more cards than any
  other change.
- **Say "cheerful" / "smiling"**, and put it "on green grass under a blue sky". Dark or indoor settings
  come back gloomy and sometimes frightening.
- **Never say "on a display stand"** — objects photograph fine simply lying on grass.
- Watch for **monochrome**: a red subject on a red ground renders as a red blur. Contrast the two.

#### Reproducibility is a per-provider fact, not a property of the pipeline

| Provider | Same prompt twice | So the revert trick… |
|---|---|---|
| `pollinations` | **same bytes** — measured over 50 minutes and across cache misses (#64), with the seed pinned to 42 | **works.** Paste round 2's prompt back and round 2's picture returns verbatim |
| `cloudflare-sdxl` | **different bytes**, despite the same pinned seed (#66) | **does not work.** A reverted prompt draws a *new* picture on this lane |
| `ai-horde` | unmeasured, and it is a pool of volunteer machines | **assume it does not.** Do not plan around it |

So: **keep every superseded `imagePrompt` in the session** until the theme ships — that is the only
recovery mechanism that spans all three. On a non-deterministic lane, deleting a candidate and re-running
is a **re-roll**: you get a different picture and you cannot get the old one back. That is occasionally the
right move (it is how you clear a blank frame, below); it is never reversible.

Even on Pollinations the trick is bounded: the provider can change the model behind a prompt without notice,
and has (#64) — a request for `flux` is served by `sana` today — so a prompt that drew one picture in July
draws a different one weeks later. Never use it to recover art that has already shipped: a published card is
protected by the Blob URL already in the database, and `--sync` only updates text on an existing card, never
regenerating or re-uploading its image. The reviewed bytes in `seed/review/` protect a card at insert time
only, and that directory is gitignored local scratch a fresh clone will not have.

#### Rate limits, per provider

Each lane paces itself from its own declared limits, and the lanes run alongside each other — so the
numbers below are *why a run takes as long as it does*, not knobs for you to turn.

| Provider | The ceiling | What you see |
|---|---|---|
| `pollinations` | **one queued request per IP** (anonymous; no key, and the paid path is a wall #72 forbids crossing) — 1 at a time, 15s apart | the slow lane: ~8 minutes for a 30-card theme, and it sets the wall-clock floor for the whole bake-off |
| `cloudflare-sdxl` | a published 10,000 neurons/day on the free plan, but **the exhaustion signal is undocumented** (#68) — so a lane that dies for no stated reason may be this. What guarantees $0 is the card-free account, not the number | 4 at a time, ~6–8s per image |
| `ai-horde` | **2 requests/second per IP** across the whole API, and a volunteer queue you sit at the back of at zero kudos | 1 at a time; **30–45 minutes for one image** |

A rate-limit failure is retryable and costs you nothing: re-run `pnpm seed --review` and it resumes past
everything already on disk. It is **not** a prompt problem and does not count as a re-prompt round. If a
provider keeps refusing, that is the free allocation's ceiling doing its job — wait and resume later.
**Never attach a payment method to unblock it.**

**Append** the theme object to the `themes` array of `seed/cards.json`. Array position **is** the theme's
display order and `themes.sort_order` is a contract: never insert mid-array, never reorder existing
entries — that reshuffles what the children already know.

## Step 5 — Validate

```bash
pnpm seed --check-urls     # schema runs first; then every sourceUrl in the file must return 200
```

Schema failure → fix the JSON. A 404 → find a URL that resolves, or change the subject; **never** delete
the field or point at a search page. Re-run until clean. This is network-only and touches no database.

## Step 6 — Commit, then generate the art

```bash
git add seed/cards.json && git commit -m "feat(seed): add the <Theme> theme"
pnpm seed --review         # generates images for NEW cards only, into seed/review/
```

`--review` needs `DATABASE_URL` (it reads the pool to scope itself to unpublished cards) but writes
nothing to it. It skips cards already published and already-reviewed prompts, so an interrupted or
rate-limited run resumes rather than restarting.

`--review` is a **bake-off** (#63): it generates each new card from **every registered lane**, in parallel,
so a human can compare candidates side by side and pick the best draughtsman per subject. A 30-card theme is
30 images *per lane* — 60 today, on `pollinations` and `cloudflare-sdxl`. The lanes run alongside each other
and pace themselves independently, so the wall-clock is the slowest lane, not the sum: expect ~8 minutes,
set by Pollinations. `ai-horde` is an **escape hatch**, not a lane, and sits out unless named (below).

If a provider's key is missing the run **aborts and generates nothing**, rather than quietly leaving that
provider out — a lane absent from a comparison looks like a provider that drew badly. Add the key, or narrow
the run on purpose:

```bash
pnpm seed --review --providers=pollinations
```

Review files land at `seed/review/<theme-slug>-<card-slug>-<hash8>-<provider>-<params4>.<ext>`. `<hash8>`
covers the *full* prompt including `ART_STYLE` and is identical across providers, so a subject's candidates
sort together. `<params4>` covers that provider's request settings, so changing them invalidates the reviews
they would change. The extension follows the provider — Pollinations writes JPEG, Cloudflare PNG, AI Horde
WebP. Each image has a `.json` sidecar recording what was requested and, *where the provider says so*, which
model actually answered: Pollinations names it except on a cache hit, and Cloudflare names nothing at all,
so a blank `model` means unwitnessed, never "the model I asked for".

If a provider stops responding, its lane is abandoned after 3 consecutive failures and the run reports it.
Re-run to resume: images already on disk are never regenerated.

### Screen the grid yourself, first — and form a *recommendation*, not a verdict

Build the contact sheet (Step 7) and screen from it — it is a grid, so you are comparing a row rather than
opening every candidate file (30 × however many providers ran). Your job here changed with the bake-off:
you are no longer accepting or rejecting one image per card, you are **reading a row of N candidates and
saying which you would pick and why**. The human still chooses (Step 7). Screening removes their grind; it
does not pre-empt them.

Rule out a candidate on:

- **Two overlapping copies of the subject**, or a subject fused with scenery. The most common failure.
- Gore, damage, fire, combat, casualties — anything from the prohibited list above.
- Scary rather than friendly.
- Wrong subject, or unreadable mush.
- Text baked into the image, or a decorative frame border. Cloudflare drew frames on roughly a third of
  candidates until **#81** found the cause in `ART_STYLE` itself — it used to say "trading-**card**
  illustration", and SDXL drew the card: a wooden frame or a tan mat with the subject inset inside it. The
  words are gone and the rate fell to ~1 in 20, so a frame is now rare rather than expected. If you see one,
  it is a re-roll, **not** a re-prompt — and do not try to word your way out of it by asking for "no border",
  which #81 measured as no better than saying nothing.
- **A photograph or a 3D render**, whichever lane drew it (#77). The published set varies enormously in
  style, but it is always an *illustration*, so photoreal skin, camera depth-of-field blur, a naturalistic
  cast shadow, or the look of a glazed figurine on a surface reads as a different product sitting in the
  binder. This is the one style question settled on sight; **every other one is a pick, not a rejection.**
  It bites the Pollinations lane hardest — `sana` leans semi-real, per the table in Step 4.
- **A blank frame.** Cloudflare can return a *pure black* 768×768 PNG for a perfectly innocuous prompt —
  ~40% of attempts on one measured prompt. It is a valid PNG at exactly the right size, so the seam accepts
  it and it lands looking like a real candidate; the tell is file size, ~2 KB against a normal 750–900 KB.
  Known and open as **#78**. The fix is a re-roll, not a re-prompt: delete that one file and re-run
  `--review`. Retrying cleared it both times it was tried.

Then, for each row, write down one of three outcomes: **a recommended provider with a one-line reason**,
**a genuine tie** (say so — the human may have a taste preference), or **nothing usable**. Only the third
one leads to more generation.

### May one theme mix providers?

Yes, and you do not need to ask. **Pick the best-drawn candidate for each card, from whichever lane drew
it** (#77).

Pick on what Step 4's per-provider table predicts — one lane draws a subject class the other cannot.
"This candidate draws the longbow as one bow" is a reason; "this lane is my favourite" is not.

Mixing costs less than it sounds like it should, because the published binder has never been uniform.
`Animals` — one theme, one provider, one run, live in children's hands — carries a flat graphic tiger, a
painterly red panda and a soft watercolour axolotl. The two lanes *do* differ, and visibly: Cloudflare is
flat and outlined where Pollinations is semi-real and painterly. That gap is real, and it is no wider
than the gap already sitting inside a single published theme.

Do not keep a lane for **continuity**, either. Pollinations drew the published cards but no longer draws
in the style that drew them (#64), so picking it buys nothing back. That is about which candidate you
pick, not about which lanes run — the lane roster is #69's, and unchanged.

Legendaries get no special rule. If two of them tie, say so at the checkpoint; do not settle it yourself.

### Which lever: pick another provider, or change the words?

Getting this wrong wastes a round, so the distinction is worth holding: **a bake-off fixes the wrong model;
re-prompting fixes the wrong words.**

| What the row looks like | Lever |
|---|---|
| One provider drew it well, another badly | **Neither.** That is a *pick* — record it in Step 8. Do not re-prompt a card another lane already nailed (#63) |
| Every candidate is the same subject drawn in a style you dislike | **Pick**, or accept. Style is a property of the lane, not of your wording — see the per-provider table in Step 4 |
| Every candidate misreads the *subject* — wrong object, fused parts, duplicated weapon | **Re-prompt.** Apply Step 4's wording levers |
| Every candidate fails and the subject is a small held object | **The escape hatch**, below. Re-prompting this class has never fixed it on either lane |
| One candidate is blank/black, the rest are fine | **Re-roll** that one file (#78). Not a re-prompt round |

**To re-prompt, edit the `imagePrompt`** — deleting files is not enough on the Pollinations lane, which
returns the same bytes for the same prompt (#64), so a delete-and-rerun there regenerates the picture you
just rejected. Editing the prompt changes `<hash8>`, which both asks for a different picture on every lane
*and* makes the old candidates stop matching.

Those old candidates are now **N files per card, plus their `.json` sidecars**, and they are invisible to
the contact sheet (it looks up the *current* hash). Leaving them is harmless; if you want the folder honest,
delete the whole superseded set at once and never a subset of it:

```bash
rm seed/review/<theme-slug>-<card-slug>-<oldhash8>-*
```

Never delete a *current* candidate to tidy a row. A missing cell reads as "that lane failed", and removing a
rival is you making the human's choice for them.

Then re-run `pnpm seed --review`. **Re-prompt only the cards that NO provider drew acceptably.** **Cap this
at 2 re-prompt rounds.** If a card still fails everywhere after two, take it to the human at the checkpoint
with the problem named — do not swap the subject silently, and do not spend the session fighting the model.

**The escape hatch, for a card the lanes refuse.** `ai-horde` is registered but sits out the fan-out (#71),
so it never appears in a normal run. Two signatures say to reach for it:

- **a subject only the hatch draws** — the small-held-object class in Step 4's table; or
- **"Cloudflare returned nothing and won't say why"** — that lane has an undocumented, non-disablable NSFW
  input filter (error 3030) with no opt-out. #66 never once made it fire, including on a longbow and a
  chariot, so this is rare rather than expected — but an unexplained Cloudflare refusal on a
  weapon-bearing subject is what it looks like, and the hatch is the only provider whose content policy
  plainly permits those subjects.

Reach it by name, for the handful of cards that need it:

```bash
pnpm seed --review --providers=ai-horde     # after the lanes have run; it resumes past what exists
```

It exists for **permission** first — it is the only provider whose content policy plainly allows
weapon-bearing subjects — and #74 found it also draws the one class both lanes fail: a **small held object**
(the first clean single bow this project has had). It is not better in general: it renders costume subjects
photo-real and loses `ART_STYLE`. It is also the slowest thing in this runbook by an order of magnitude — a
volunteer queue, and this project's account holds no kudos, so **one image can take 30–45 minutes**. Use it
for the one or two cards that earned it, never for a theme. Its candidates land in `seed/review/` and appear
in the contact sheet exactly like a lane's, so a pick on the hatch is recorded exactly like any other.

**If the horde refuses the prompt, stop — do not re-run it.** Two or more matches against its content regex
in one prompt is a `CorruptPrompt`: a terminal failure *plus* a timeout on this machine's IP that escalates
**3 → 9 → 15 → 21 minutes**, on a 24-hour counter. Retrying immediately makes the next wait longer. The
refusal is also information — this prompt is unworkable on the one provider whose policy was supposed to be
permissive — so the response is to reword it (Step 4's levers) or take the card to the human, never to
re-submit it as-is. Only the hatch's lane is affected; Cloudflare and Pollinations carry on.

One thing is easier here than anywhere else: **on AI Horde, paying is not merely forbidden, it is
impossible.** The service has no payment surface at all, so this is the only provider where the $0 constraint
is enforced by the service rather than by the account state you are trusted to preserve.

Amend the commit if you changed any `imagePrompt`. **Do not write a `provider` value yet** — that is the
human's choice, recorded in Step 8.

## Step 7 — Build the contact sheet → **CHECKPOINT 2**

```bash
pnpm contact-sheet "<Theme Name>"      # exact theme name, e.g. "Ocean Machines"
```

One HTML page: **one row per subject, one column per provider**, so the human compares a row rather than
opening a folder. Each cell is labelled with the model that actually answered, and the cell `--sync` would
publish is outlined.

The page states three things rather than hiding them, and so does the command:

- **MISSING cells** — that *lane* produced nothing for that card. A dead lane or a narrowed run, *not* a
  provider that drew badly. An escape-hatch column (`ai-horde`) is labelled as such and blank by default —
  that is the arrangement working, so it is not counted here.
- **cards with no pick** — expected at this point, since the picking happens *here*. `--sync` refuses every
  one of them until Step 8 sets a `provider` on the card or its theme.
- **orphan files** — candidates on disk from a provider no longer registered.

**This checkpoint is a choice, not a yes/no.** The human is picking a provider per row, so give them what a
chooser needs and nothing more:

- the file path;
- your **recommendation per row** — provider and a one-line reason — and which rows you think are ties;
- every card you re-prompted, and how many rounds it took;
- every card **nothing drew acceptably**, named as such;
- anything you are unsure about, including any cell you suspect is a blank frame (#78).

Then **stop and wait for an explicit approval.** The human holds the kid-safety veto and the taste call;
your screening only removes their grind, it does not replace them. This is the **second and last**
checkpoint — publishing does not get another one. `seed/review/*.html` is a local scratch artifact — do not
commit it.

## Step 8 — Record the pick

The human has chosen; write it down. This is the one step with no counterpart in the old single-provider
pipeline, and it is what stands between a reviewed image and a published one.

In `seed/cards.json`, set **`provider` on the theme** to whichever provider won most rows, and add
`provider` to **individual cards only where a different one won** — a sparse override list, not 30 repeats.
A theme carrying several lanes is normal (#77):

Add one key to the theme object, and one key to each overridden card. Everything else in the file is left
exactly as it is — no other field is touched by this step:

```jsonc
// on the theme object, alongside "name" and "cards":
"provider": "cloudflare-sdxl",

// on a card object that a different provider won, alongside its five fields:
"provider": "ai-horde",
```

`--sync` resolves `card.provider ?? theme.provider` and publishes **that** provider's reviewed bytes. The id
must match a registered provider exactly (`pollinations`, `cloudflare-sdxl`, `ai-horde`); a typo is refused
by name rather than treated as a missing review.

```bash
git add seed/cards.json && git commit -m "feat(seed): record the <Theme> bake-off picks"
```

## Step 9 — Publish

Only after approval:

```bash
pnpm seed --sync           # publishes the REVIEWED bytes -> Blob -> DB insert; idempotent
```

`--sync` is delta-only: it inserts new cards, updates text on existing ones, and republishes nothing it
does not have to. It refuses to insert any card lacking a reviewed image from its resolved provider.

**The fail-safe, stated so nobody works around it:** a theme with **no pick recorded publishes nothing.**
`--sync` reports each such card as *"no provider chosen (bake-off not judged)"* and exits without writing.
That is the design working — an unjudged bake-off has no reviewed image, only candidates — not a bug. The
fix is always Step 8, never `--allow-unreviewed`.

Then:

```bash
git push -u origin theme/<theme-slug>
gh pr create --fill
```

Report to the human: cards inserted, images published, the PR URL.

---

## Hard stops

Abort the run and report. Do not improvise past any of these.

| Signal | Why you stop |
|---|---|
| `--sync` reports a pending **prune**, or asks you to type a collection-row count | Something was renamed or dropped in the seed file. A prune deletes cards **out of the children's collections**. Fix the file. **Never pass `--allow-prune`.** |
| `--sync` refuses: "would be inserted with no reviewed image" | Run `--review` first. **Never pass `--allow-unreviewed`** — it defeats the guarantee that no unreviewed image reaches a child. |
| `--sync` refuses: "no provider chosen (bake-off not judged)" | The pick was never recorded. Go back to Step 8 — the human's choice, written into `seed/cards.json`. Never route around it with `--allow-unreviewed`. |
| `--sync` refuses: "name a provider that is not registered" | A typo, or an adapter that was retired. Fix the `provider` value; re-running `--review` cannot satisfy this one. |
| `--review` aborts naming an unconfigured provider | Add the key, or narrow the run *on purpose* with `--providers=`. Never let a lane drop out silently — a blank column reads as a provider that drew badly. |
| Schema failure you cannot resolve without dropping below 30 cards or off the pyramid | The theme is not viable as scoped. That is a human call. |
| A `sourceUrl` you cannot make resolve for a subject you consider essential | Ditto. |
| An image still failing after 2 re-prompt rounds on every provider | Take it to the checkpoint, named. |
| `DATABASE_URL` / `BLOB_READ_WRITE_TOKEN` missing | Report it; do not go hunting for credentials. |

## Never

- Never remove or rename an existing theme or card. Removal from the seed file **prunes it from every
  child's collection**.
- Never reorder the `themes` array.
- Never pass `--allow-prune`, `--allow-unreviewed`, or `--reset`.
- Never answer a checkpoint on the human's behalf — including the bake-off pick, which is a *choice* the
  human makes at checkpoint 2 and you only ever recommend.
- **Never rename, copy or hand-edit a file in `seed/review/` to make a card look picked.** The filename is
  the whole audit trail: `<hash8>` says which prompt drew it and `<provider>-<params4>` says who drew it
  with what settings. Renaming one provider's candidate to another's is publishing bytes no one reviewed
  under that name — the exact hole `--sync`'s refusal exists to close. A card is picked by writing
  `provider` into `seed/cards.json`, and by nothing else.
- Never delete a current candidate to narrow a row. A missing cell means a lane failed; making a rival
  disappear is answering checkpoint 2 for the human.
- Never edit `src/features/pool/seed-schema.ts` to make a theme fit. The theme bends, not the pyramid.
- Never move a provider between lane and escape hatch, or add one, to get a run through. The registry
  (`src/features/pool/providers/index.ts`) is a reviewed code change, not a lever in an authoring session.
- **Never turn on AI Horde's `replacement_filter` to get a blocked prompt through.** It does make the
  refusal and its IP timeout disappear — by silently rewriting the prompt before a worker sees it, with no
  signal anywhere in the response. You would then review an image drawn from words this project never sent,
  filed under a hash of the words it did. Same for any other pinned request parameter: they are pinned
  because they change the bytes.
- **Never attach a payment method to an image-provider account, and never sign in to one that already
  has a card.** Recurring cost for this pipeline is $0, and the guarantee is the account state, not a
  budget: a card-free account can only ever refuse a request, whereas a carded one bills silently and you
  find out by invoice. A quota wall is the ceiling doing its job — wait it out, thin the run, or take it
  to the human. Upgrading the plan is never the fix.
