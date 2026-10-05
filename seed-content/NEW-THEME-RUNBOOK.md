# Runbook — add a new theme (category)

**Audience: an agent.** You are handed one thing — a theme name — and you drive the whole category into
the live pool: choose the 30 subjects, author the JSON, validate it, generate the art, screen it, get one
human approval, publish, and open a PR.

This file supersedes the old `AUTHORING_PROMPT.md`. It is the only card-authoring document.

**Invocation:** _"Add the theme **Ocean Machines** using `seed-content/NEW-THEME-RUNBOOK.md`."_

## Contract

| | |
|---|---|
| **Input** | A theme name. Nothing else. Any extra steer from the human (e.g. "lean historical") overrides this document's defaults where they conflict. |
| **Output** | 30 published cards, images reviewed, the winning provider recorded in `seed-content/cards.json`, committed on a branch, a PR open. |
| **Human checkpoints** | Exactly **two**: the 30-name list (Step 3), and the image contact sheet (Step 7). Still two — the bake-off did **not** add a third; it changed what the second one *is*, from approve/reject to **choose among N candidates**. Stop dead at both — do not proceed on silence, and never answer them yourself. |
| **Blast radius** | `pnpm seed --sync` writes to the **production** Neon DB and Blob store that the children play against. `--check-urls`, `--check-images` and `--review` do not write to it. `--blob-budget` reads the DB and Blob but writes nothing; `--supergrok-export` reads the DB and writes only the export brief. |
| **Session** | One theme per run. Do not batch two themes. |

## Rules the schema enforces

`src/shared/pool/seed-schema.ts` runs on **every** `pnpm seed` command and fails the whole file, so a
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
node -e "const d=require('./seed-content/cards.json');console.log(d.themes.map(t=>t.name).join('\n'))"
node -e "const d=require('./seed-content/cards.json');console.log(d.themes.flatMap(t=>t.cards.map(c=>c.name)).sort().join('\n'))"
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
  *Spooky Legends*, *Deep Sea Creatures*, *Flying Machines*, *Ocean Machines*, *Warriors*,
  *Artillery*, *Outer Space*, *Land Machines*, *Rocks and Gems*, *Trees*, *Birds*,
  *Food Around the World*).
- **`eduText`** — true, simple, readable by a 7-year-old, ≤ 120 chars. For **fictional** subjects the
  fact is about the *story or folklore* ("Mary Shelley wrote Frankenstein at 18…") — never present
  fiction as fact.
- **`sourceUrl`** — a real, resolvable URL backing the fact. Wikipedia is fine. Parenthesised suffixes
  often 404; Step 5 catches it.
- **`imagePrompt`** — concrete, kid-friendly, **no art-style words**: `buildPrompt()` appends `ART_STYLE`
  for you. What works across every provider: name **one** subject ("a single …"), give a viewpoint ("side
  view"), put it somewhere plain ("parked on grass"). Sleek aircraft photographed in flight are the shape
  most often rendered as two overlapping copies. And name **no object the picture sits inside** — a card,
  a frame, a border, a mat. Cloudflare's SDXL draws those literally, insetting the real subject within
  them. That was #81, and it came from `ART_STYLE` itself saying "trading-card" rather than from any
  card's own wording — but the same words in an `imagePrompt` reach the same model, and nothing checks
  for them. Note the rule is about **naming the object at all**: "no border" is a border cue, not a
  prohibition (#81 measured it).

### What the providers can and cannot draw

Read this **before** you pick subjects, not after — some of it is a constraint on Step 3, not on your
wording. It is written **per provider**, because they do not fail the same way. There is no such thing as
"the image model" here any more: Step 6 draws every card on every lane and a human picks (#63).

**`pollinations` is retired.** On *Food Around the World* every one of its 30 candidates came back with a
"pollinations.ai" logo stamped into the corner despite `nologo=true`, and text in the image is a rejection on
sight — so it could no longer win a row. It is gone from the registry: the one automatic lane today is
`cloudflare-sdxl`, with `supergrok-manual` as an opt-in drop-folder lane (below) and **no escape hatch
currently registered** — `ai-horde`, the first one, was retired after its pinned model lost its workers.
Pollinations' column below is kept as the record of why earlier themes look the way they do, and because
its failure classes are what a replacement lane (or hatch) has to beat. Cards already published from it are
unaffected — `--sync` never resolves the provider of a card it is not inserting.

The failure classes below were learned the hard way on *Warriors*, where a Pollinations-only pass returned
3 usable images out of 28. #66 re-ran three of those cards through the shipped seam on both lanes, and #74
ran them through the (since-retired) escape hatch. What survives is narrower than the old blanket claim:

| Failure class | `pollinations` (**retired**; asked for `flux`, served by `sana` — #64) | `cloudflare-sdxl` | `ai-horde` (escape hatch, **retired**) | `supergrok-manual` (manual, opt-in) |
|---|---|---|---|---|
| Identity rests on a **small held object** — bow, spear, tool | **fails** — the object goes wire-thin, smears, or duplicates | **fails** — right style, still draws two bows. (#74 also saw a frame border on every sample; that was #81's bug in `ART_STYLE`, since fixed, and is no longer part of this row) | **the one it fixed** — #74's single bow, single arrow: the first usable Longbowman this project had | the picture you saved, or **not drawn** — this lane does not draw |
| Identity rests on **niche uniform accuracy** | **fails** — a plausible costume from the wrong century or country, or a photoreal toddler in fancy dress | **usually passes** — #66 drew the Swiss Guard's blue/yellow stripes and ruff correctly; #74 saw a generic modern uniform on a different sample, so treat it as *much better, not reliable* | **failed differently** — costume correct, but rendered photo-real, which loses `ART_STYLE` | the picture you saved, or **not drawn** |
| **Multi-object scene** — a rider and a vehicle, a crowd | **fails** — the parts recombine into something else (a Victorian pony-trap for an Egyptian chariot; one figurine for the Terracotta Army) | **passes** — two horses, gold chariot, nemes headdress; rows of clay soldiers in a trench | **best seen for the class**, but miscounted (one horse where the prompt said two) | the picture you saved, or **not drawn** |

**`supergrok-manual` does not draw.** You generate the pictures yourself in Grok (the app, grok.com, or X) under your subscription, and the bake-off places those files beside the automatic lanes so you can pick. There is no xAI API call and no key — calling Grok from code is a billed API, which the $0 rule forbids. How a picture fails is whatever you see on the sheet. A card you did not save a picture for is **not drawn**, which is a missing file, not a bad drawing. Steps are in Step 6.

**What that means for Step 3.** Niche uniforms and multi-object scenes are **no longer disqualifying** —
a theme that needs them is viable, on the Cloudflare lane. **Small held objects still are**: the lane fails
them, and with the escape hatch retired and no replacement registered, the only remaining lever is
cheap-then-expensive — drop the object and let clothing carry the subject (the wording lever below), or
hand-draw it yourself through `supergrok-manual` (Step 6). Budget one or two such cards per theme, not
fifteen, and expect to spend manual-lane time on them.

`ART_STYLE` asks for a bright cartoon, and **the lanes do not agree about what they are drawing**:
Cloudflare renders bright cartoon; `sana` (retired Pollinations) rendered painterly semi-realism on *every*
subject, and the retired hatch's model drifted photo-real on costume subjects. So a picture that looks wrong
in style is usually the wrong lane rather than the wrong words. Long, photo-real prompts make it worse
everywhere. The prompts that land look like the ones already in `cards.json`: a short noun phrase, **one**
cheerful subject, outdoors in daylight, **at most one** held object.

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
| `cloudflare-sdxl` | **different bytes**, despite the same pinned seed (#66) | **does not work.** A reverted prompt draws a *new* picture on this lane |
| `supergrok-manual` | the file you saved, until you delete its review candidate | nothing to revert. Replace the drop file and delete that one review file, then re-run the import |

So: **keep every superseded `imagePrompt` in the session** until the theme ships — that is the only
record of what you tried. On a non-deterministic lane, deleting a candidate and re-running
is a **re-roll**: you get a different picture and you cannot get the old one back. That is occasionally the
right move (it is how you clear a near-empty frame, below); it is never reversible.

No registered provider returns the same picture for a reverted prompt, so there is no revert trick at all.
Nor is there one for art that has already shipped: a published card is
protected by the Blob URL already in the database, and `--sync` only updates text on an existing card, never
regenerating or re-uploading its image. The reviewed bytes in `seed-content/review/` protect a card at insert time
only, and that directory is gitignored local scratch a fresh clone will not have.

#### Rate limits, per provider

Each lane paces itself from its own declared limits, and the lanes run alongside each other — so the
numbers below are *why a run takes as long as it does*, not knobs for you to turn.

| Provider | The ceiling | What you see |
|---|---|---|
| `cloudflare-sdxl` | a published 10,000 neurons/day on the free plan, but **the exhaustion signal is undocumented** (#68) — so a lane that dies for no stated reason may be this. What guarantees $0 is the card-free account, not the number | 4 at a time, ~6–8s per image |
| `supergrok-manual` | none — local files, no requests | however long you take to save the pictures |

A rate-limit failure is retryable and costs you nothing: re-run `pnpm seed --review` and it resumes past
everything already on disk. It is **not** a prompt problem and does not count as a re-prompt round. If a
provider keeps refusing, that is the free allocation's ceiling doing its job — wait and resume later.
**Never attach a payment method to unblock it.**

**Append** the theme object to the `themes` array of `seed-content/cards.json`. Array position **is** the theme's
display order and `themes.sort_order` is a contract: never insert mid-array, never reorder existing
entries — that reshuffles what the children already know.

## Step 5 — Validate

```bash
pnpm seed --check-urls     # schema runs first; then every sourceUrl in the file must return 200
```

Schema failure → fix the JSON. A 404 → find a URL that resolves, or change the subject; **never** delete
the field or point at a search page. Re-run until clean. This is network-only and touches no database.

Then, separately — this one **does** read the database and needs `DATABASE_URL` and
`BLOB_READ_WRITE_TOKEN`:

```bash
pnpm seed --blob-budget    # is there room in Blob for another 30 cards? (#79)
```

Read-only. It prints how much of the plan's storage allowance the pool has spent, plus how many more
30-card themes fit **at each registered lane's measured weight**. Run it here rather than after publishing,
because it is only useful while you can still act on it. On 2026-08-15 it read *31.36 MB of 1.00 GB, 39 more
Cloudflare themes* — so the honest summary is **there is room, and lanes can differ by an order of
magnitude in how fast it goes**. If it warns, stop: see *Hard stops*.

Two things it does **not** cover, so you know what it is not telling you. It watches Blob **storage**
only; image transformations are a deployment meter with no read path from the CLI, and on 2026-08-15 that
was the meter nearest its cap (2,998 of 5,000 per 30 days) — check the team's usage page for that one. And
its ceiling is the **Hobby** allowance hardcoded; if the plan has changed since, the number is wrong.

## Step 6 — Commit, then generate the art

```bash
git add seed-content/cards.json && git commit -m "feat(seed): add the <Theme> theme"
pnpm seed --review         # generates images for NEW cards only, into seed-content/review/
```

`--review` needs `DATABASE_URL` (it reads the pool to scope itself to unpublished cards) but writes
nothing to it. It skips cards already published and already-reviewed prompts, so an interrupted or
rate-limited run resumes rather than restarting.

`--review` is a **bake-off** (#63): it generates each new card from **every provider whose `role` is
`lane`**, in parallel,
so a human can compare candidates side by side and pick the best draughtsman per subject. A 30-card theme is
30 images *per lane* — 30 today, on `cloudflare-sdxl` alone, in a few minutes. With more than one lane they
run alongside each other and pace themselves independently, so the wall-clock is the slowest lane, not the
sum. An **escape hatch** — registered but not a lane, sitting out unless named (below) — is a role the
registry still supports; none is currently registered (`ai-horde`, the first one, was retired).

If a provider's key is missing the run **aborts and generates nothing**, rather than quietly leaving that
provider out — a lane absent from a comparison looks like a provider that drew badly. Add the key, or narrow
the run on purpose:

```bash
pnpm seed --review --providers=cloudflare-sdxl
```

`supergrok-manual` sits out of that run. It has no key, so a missing key cannot abort you for it, and it does not draw unless you name it.

### The manual lane — pictures you generate in Grok

Use this when you want a SuperGrok picture beside the automatic lanes. You generate it yourself, under your subscription. This repo never calls Grok.

```bash
pnpm seed --supergrok-export
```

That writes `seed-content/supergrok-drop/brief.md`: one entry per card the bake-off would draw (the same unpublished set `--review` uses). Each entry has the card name, the **exact** prompt every other lane receives (`ART_STYLE` included), and the filename to save the picture as.

Work through the brief in Grok — the app, grok.com, or X. Paste the prompt. Save the picture into `seed-content/supergrok-drop/` under that filename. `.jpg`, `.jpeg`, or `.webp` is fine when that is what Grok downloaded; keep the stem. Do not add an xAI API key anywhere.

```bash
pnpm seed --review --providers=supergrok-manual
```

You can name it next to a lane (`--providers=cloudflare-sdxl,supergrok-manual`) or after the lanes have already run. Import reads the drop folder, fits each picture to 768×768 PNG (center crop, no letterbox — a letterbox is a border), and writes the usual content-addressed review file. `--sync` publishes **that** file, byte for byte, the same way it publishes any lane. It does not read the drop folder again.

#### Scripting the manual lane

Copying each card's prompt by hand, saving each picture, and renaming/moving it into the drop folder is manual and error-prone at 30 cards. `pnpm supergrok "<Theme Name>"` scripts that loop:

```bash
pnpm supergrok "Ocean Machines"
```

For each card, in order, it copies the exact prompt (`ART_STYLE` included — the same text every automatic lane gets) to the clipboard via `pbcopy`, then watches `~/Downloads` for a new `.png`/`.jpg`/`.jpeg`/`.webp` file. Once Grok's picture lands there, it moves it into `seed-content/supergrok-drop/` under the card's expected filename and advances to the next card. At the prompt you can type `skip` (come back to it later), `redo` (re-copy and wait again for this same card), or `quit` (stop early — nothing already dropped is lost). A card the drop folder already has a matching picture for (by prompt hash) is skipped automatically, so re-running the command after a `skip` or a `quit` resumes rather than re-asking for pictures you already saved.

When the walk finishes (or you `quit`), it runs `pnpm seed --review --providers=supergrok-manual` to import what was dropped, then `pnpm contact-sheet` to build the comparison sheet — the same two commands you would otherwise run by hand next.

It reads the card list and prompts straight from `seed-content/cards.json` — not `--supergrok-export`'s brief, and not the database. It never calls the xAI/Grok API, never automates a browser, makes no network calls of its own, and never opens `DATABASE_URL` or runs `--sync`/`--publish` — only the two hand-off commands above do, and only after the walk is done. It does not filter by what is already published, so it is for a theme mid-authoring (the normal case); a card that happens to already be published just gets a picture nobody imports.

A card with no picture is reported as **not drawn**. The contact sheet says so in that cell. It is not a failed generation, and it does not abandon the lane. Re-running skips pictures already imported. To replace one, delete that card's `supergrok-manual` review file (and its `.json` sidecar) and run the import again.

Review files land at `seed-content/review/<theme-slug>-<card-slug>-<hash8>-<provider>-<params4>.<ext>`. `<hash8>`
covers the *full* prompt including `ART_STYLE` and is identical across providers, so a subject's candidates
sort together. `<params4>` covers that provider's request settings, so changing them invalidates the reviews
they would change. The extension follows the provider — Cloudflare writes PNG (the retired AI Horde adapter
wrote WebP; retired Pollinations wrote JPEG). Each image has a `.json` sidecar recording what was requested and, *where the provider says so*, which
model actually answered: Cloudflare names nothing at all,
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
- Text baked into the image, or a decorative frame border. Cloudflare framed **most** candidates until
  **#81** found the cause in `ART_STYLE` itself — it used to say "trading-**card** illustration", and SDXL
  drew the card: a wooden frame or a tan mat with the subject inset inside it. The words are gone and the
  rate fell to about 1 in 20, so a frame is now rare rather than expected. If you see one it is a
  **re-roll, not a re-prompt** — and do not try to word your way out of it by asking for "no border",
  which is a border cue rather than a prohibition. Measurements in `src/shared/pool/prompt.ts`.
- **A photograph or a 3D render**, whichever lane drew it (#77). The published set varies enormously in
  style, but it is always an *illustration*, so photoreal skin, camera depth-of-field blur, a naturalistic
  cast shadow, or the look of a glazed figurine on a surface reads as a different product sitting in the
  binder. This is the one style question settled on sight; **every other one is a pick, not a rejection.**
  It bit the retired Pollinations lane hardest; on Cloudflare it is rare, and the hatch drifts photo-real on costumes.
- **A blank frame.** Cloudflare can return a *pure black* 768×768 PNG for a perfectly innocuous prompt —
  ~40% of attempts on one measured prompt. It is a valid PNG at exactly the right size, so it used to reach
  `seed-content/review/` looking like a real candidate, with file size (~2 KB against a normal 750–900 KB) the only
  tell. **Closed by #78**: the seam now measures encoded bytes per pixel and refuses anything below
  0.02 B/px as retryable, so the lane simply draws again and the blank never lands. A card that blanks every
  attempt fails the ladder, prints a `✗` line naming it during the run, and counts as a failure in that
  lane's summary — so it reaches you as a *missing* candidate, never a black one.
  You may still meet a frame that is nearly empty but textured enough to clear the floor: that is a re-roll,
  not a re-prompt (delete that one file, re-run `--review`), and it is the one judgement the guard leaves to
  you. See `src/shared/pool/blank-frame.ts` for what the floor is measured against.

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
painterly red panda and a soft watercolour axolotl. Cloudflare is flat and outlined; the hatch drifts
photo-real on costume subjects, and the retired Pollinations lane was semi-real and painterly. Those gaps are
real, and no wider than the gap already sitting inside a single published theme.

Do not keep a lane for **continuity**, either. Pollinations drew many of the published cards but had stopped
drawing in the style that drew them (#64) well before it was retired, so matching it was never on offer.

Legendaries get no special rule. If two of them tie, say so at the checkpoint; do not settle it yourself.

### Does a lane's file size change the pick?

**No. Pick on the picture (#79).** Cloudflare SDXL returns ~826 KB PNGs against Pollinations' ~78 KB
JPEGs, and that 10× is real in the Blob store and nowhere else that matters:

- **The child never receives it.** Every card surface renders through `next/image`, so what a browser
  downloads is a re-encoded WebP at the width it asked for, and *the ordering inverts*. Measured through
  the production optimizer on 2026-08-15, at `w=512 q=75`: a 937.9 KB Cloudflare PNG delivered **39.5 KB**,
  a 147.9 KB JPEG delivered **68.4 KB**, a 41.5 KB Pollinations JPEG delivered **9.6 KB**. Delivered weight
  tracks how busy the *picture* is, not how heavy the source file was.
- **Image transformations don't care either.** They are billed per cache miss, so a 30-card theme costs at
  most 30 × 4 requested widths = 120 of them whichever lane drew it.
- **Storage is the one meter it moves**, and `--blob-budget` in Step 5 is where you find out whether that
  matters this run. At the last reading it did not.

So there is nothing to trade off at the checkpoint. If `--blob-budget` ever says otherwise, that is a
decision about *how many more themes to publish*, not about which candidate is the better drawing.

### Which lever: pick another provider, or change the words?

Getting this wrong wastes a round, so the distinction is worth holding: **a bake-off fixes the wrong model;
re-prompting fixes the wrong words.**

| What the row looks like | Lever |
|---|---|
| One provider drew it well, another badly | **Neither.** That is a *pick* — record it in Step 8. Do not re-prompt a card another lane already nailed (#63) |
| Every candidate is the same subject drawn in a style you dislike | **Pick**, or accept. Style is a property of the lane, not of your wording — see the per-provider table in Step 4 |
| Every candidate misreads the *subject* — wrong object, fused parts, duplicated weapon | **Re-prompt.** Apply Step 4's wording levers |
| Every candidate fails and the subject is a small held object | **`supergrok-manual`**, below (Step 6) — no escape hatch is currently registered. Re-prompting this class has never fixed it on the lane |
| One candidate is nearly empty, the rest are fine | **Re-roll** that one file. Not a re-prompt round. An outright *black* frame no longer reaches you — the seam refuses it and the lane redraws (#78) |
| One cell is missing from the sheet entirely | Not a judgement call: that lane failed the card and printed a `✗` line naming it. Re-run `--review` |

**To re-prompt, edit the `imagePrompt`** — deleting files and re-running is a re-roll, not a re-prompt.
Editing the prompt changes `<hash8>`, which both asks for a different picture on every lane
*and* makes the old candidates stop matching.

Those old candidates are now **N files per card, plus their `.json` sidecars**, and they are invisible to
the contact sheet (it looks up the *current* hash). Leaving them is harmless; if you want the folder honest,
delete the whole superseded set at once and never a subset of it:

```bash
rm seed-content/review/<theme-slug>-<card-slug>-<oldhash8>-*
```

Never delete a *current* candidate to tidy a row. A missing cell reads as "that lane failed", and removing a
rival is you making the human's choice for them.

Then re-run `pnpm seed --review`. **Re-prompt only the cards that NO provider drew acceptably.** **Cap this
at 2 re-prompt rounds.** If a card still fails everywhere after two, take it to the human at the checkpoint
with the problem named — do not swap the subject silently, and do not spend the session fighting the model.

**No escape hatch for a card the lane refuses.** `ai-horde`, the first one, was retired because its pinned
model lost its workers — the registry still supports the role (`escape-hatch`), but nothing is currently
registered under it. A card that fails the small-held-object
class (Step 4) or that Cloudflare refuses outright now has exactly two levers, both in Step 4/6: reword it
(drop the weapon, let clothing carry the subject) or draw it yourself through `supergrok-manual`. Treat
small-held-object subjects as a real constraint on Step 3's subject list again, not a solved problem.

**Cloudflare can still refuse outright, with no hatch to fall back on.** It has an undocumented,
non-disablable NSFW input filter (error 3030) with no opt-out. #66 never once made it fire, including on a
longbow and a chariot, so this is rare rather than expected — but an unexplained Cloudflare refusal on a
weapon-bearing subject is what it looks like. Reword (Step 4's levers) or take the card to the human,
same as any other failure that survives two re-prompt rounds.

Amend the commit if you changed any `imagePrompt`. **Do not write a `provider` value yet** — that is the
human's choice, recorded in Step 8.

## Step 7 — Build the contact sheet → **CHECKPOINT 2**

```bash
pnpm contact-sheet "<Theme Name>"      # exact theme name, e.g. "Ocean Machines"
```

One HTML page: **one row per subject, one column per provider**, so the human compares a row rather than
opening a folder. Each cell is labelled with the model that actually answered, and the cell `--sync` would
publish is outlined.

The page states four things rather than hiding them, and so does the command:

- **MISSING cells** — that *lane* produced nothing for that card. A dead lane or a narrowed run, *not* a
  provider that drew badly. An escape-hatch column, if one is ever registered again, is labelled as such and
  blank by default — that is the arrangement working, so it is not counted here.
- **"not drawn" cells** — the manual lane (`supergrok-manual`) had no picture in the drop folder for that
  card. That is a missing file, not a bad drawing, and it is not counted as a MISSING lane cell. A picture
  you did import sits in that column beside the automatic candidates.
- **cards with no pick** — expected at this point, since the picking happens *here*. `--sync` refuses every
  one of them until Step 8 sets a `provider` on the card or its theme.
- **orphan files** — candidates on disk from a provider no longer registered.

**This checkpoint is a choice, not a yes/no.** The human is picking a provider per row, so give them what a
chooser needs and nothing more:

- the file path;
- your **recommendation per row** — provider and a one-line reason — and which rows you think are ties;
- every card you re-prompted, and how many rounds it took;
- every card **nothing drew acceptably**, named as such;
- anything you are unsure about, including any cell that looks nearly empty (an outright blank one
  cannot reach you any more — #78).

Then **stop and wait for an explicit approval.** The human holds the kid-safety veto and the taste call;
your screening only removes their grind, it does not replace them. This is the **second and last**
checkpoint — publishing does not get another one. `seed-content/review/*.html` is a local scratch artifact — do not
commit it.

## Step 8 — Record the pick

The human has chosen; write it down. This is the one step with no counterpart in the old single-provider
pipeline, and it is what stands between a reviewed image and a published one.

In `seed-content/cards.json`, set **`provider` on the theme** to whichever provider won most rows, and add
`provider` to **individual cards only where a different one won** — a sparse override list, not 30 repeats.
A theme carrying several lanes is normal (#77):

Add one key to the theme object, and one key to each overridden card. Everything else in the file is left
exactly as it is — no other field is touched by this step:

```jsonc
// on the theme object, alongside "name" and "cards":
"provider": "cloudflare-sdxl",

// on a card object that a different provider won, alongside its five fields:
"provider": "supergrok-manual",
```

`--sync` resolves `card.provider ?? theme.provider` and publishes **that** provider's reviewed bytes. The id
must match a registered provider exactly — see the registry at `src/shared/pool/providers/index.ts`, or run
`--sync` on an unknown id to have it print every registered id; a typo is refused by name rather than
treated as a missing review.

```bash
git add seed-content/cards.json && git commit -m "feat(seed): record the <Theme> bake-off picks"
```

## Step 9 — Publish

Only after approval:

```bash
pnpm seed --sync           # publishes the REVIEWED bytes -> Blob -> DB insert; idempotent
```

`--sync` is delta-only: it inserts new cards, updates text on existing ones, and republishes nothing it
does not have to. It refuses to insert any card lacking a reviewed image from its resolved provider.

Optionally, once the theme is in:

```bash
pnpm seed --check-images   # weigh every PUBLISHED card's art; reports any blank frame (#78)
```

Read-only, no writes, and it covers the whole pool rather than your theme — a published card is never
re-generated and never re-audited by any other command, so this is the only pass over those bytes.

**The fail-safe, stated so nobody works around it:** a theme with **no pick recorded publishes nothing.**
`--sync` reports each such card as *"no provider chosen (bake-off not judged)"* and exits without writing.
That is the design working — an unjudged bake-off has no reviewed image, only candidates — not a bug. The
fix is always Step 8 — there is no bypass flag; `--allow-unreviewed` was removed from the CLI entirely.

`--sync` also rewrites **`seed-content/provenance.json`**, one entry per card it just published, recording what
actually drew it — the model the response *named*, the parameters that were *asked for*, and the review key
those bytes were reviewed under (#75). `seed-content/review/` is scratch and gets deleted; this is the only thing
that outlives it. **Commit it with the theme** — it is generated, so never hand-edit it, and never write an
entry for a card you did not just publish:

```bash
git add seed-content/provenance.json && git commit -m "chore(seed): record what drew <Theme>"
git push -u origin theme/<theme-slug>
gh pr create --fill
```

If a card publishes with *"no readable sidecar beside the reviewed image"*, that card gets no entry. Report
it; do not invent one — a `params` bag copied from today's adapter is a guess, not a record.

Every entry a runbook run produces reads `"reviewed": true` — there is no longer a way to publish
unreviewed bytes, so no entry can read otherwise. If you ever see `"reviewed": false` in a diff, the
provenance file was hand-edited or predates this; stop and report rather than committing it.

Report to the human: cards inserted, images published, the PR URL.

---

## Hard stops

Abort the run and report. Do not improvise past any of these.

| Signal | Why you stop |
|---|---|
| `--sync` reports a pending **prune**, or asks you to type a collection-row count | Something was renamed or dropped in the seed file. A prune deletes cards **out of the children's collections**. Fix the file. **Never pass `--allow-prune`.** |
| `--sync` refuses: "would be inserted with no reviewed image" | Run `--review` first. There is no bypass flag — `--allow-unreviewed` was removed from the CLI because it defeated the guarantee that no unreviewed image reaches a child. |
| `--sync` refuses: "no provider chosen (bake-off not judged)" | The pick was never recorded. Go back to Step 8 — the human's choice, written into `seed-content/cards.json`. There is no flag to route around it. |
| `--sync` refuses: "name a provider that is not registered" | A typo, or an adapter that was retired. Fix the `provider` value; re-running `--review` cannot satisfy this one. |
| `--sync` refuses: "seed-content/provenance.json is unreadable" | The generated provenance record was hand-edited or truncated. Nothing has been written. Restore it with `git checkout seed-content/provenance.json`; never repair it by hand. |
| `--review` aborts naming an unconfigured provider | Add the key, or narrow the run *on purpose* with `--providers=`. Never let a lane drop out silently — a blank column reads as a provider that drew badly. |
| Schema failure you cannot resolve without dropping below 30 cards or off the pyramid | The theme is not viable as scoped. That is a human call. |
| A `sourceUrl` you cannot make resolve for a subject you consider essential | Ditto. |
| An image still failing after 2 re-prompt rounds on every provider | Take it to the checkpoint, named. |
| `--blob-budget` warns that the store is past 80% of its allowance | Publish nothing further. Exceeding it produces no bill on this plan — it **cuts off access to the Blob store** until the 30-day window rolls, and a card whose optimized variant is not already cached then renders as its alt text. Report it: the levers are a plan change or removing bytes, and both are human calls. |
| `DATABASE_URL` / `BLOB_READ_WRITE_TOKEN` missing | Report it; do not go hunting for credentials. |

## Never

- Never remove or rename an existing theme or card. Removal from the seed file **prunes it from every
  child's collection**.
- Never reorder the `themes` array.
- Never pass `--allow-prune`. (`--allow-unreviewed`, `--publish` and `--reset` no longer exist in the CLI.)
- Never answer a checkpoint on the human's behalf — including the bake-off pick, which is a *choice* the
  human makes at checkpoint 2 and you only ever recommend.
- **Never rename, copy or hand-edit a file in `seed-content/review/` to make a card look picked.** The filename is
  the whole audit trail: `<hash8>` says which prompt drew it and `<provider>-<params4>` says who drew it
  with what settings. Renaming one provider's candidate to another's is publishing bytes no one reviewed
  under that name — the exact hole `--sync`'s refusal exists to close. A card is picked by writing
  `provider` into `seed-content/cards.json`, and by nothing else.
- Never delete a current candidate to narrow a row. A missing cell means a lane failed; making a rival
  disappear is answering checkpoint 2 for the human.
- Never edit `src/shared/pool/seed-schema.ts` to make a theme fit. The theme bends, not the pyramid.
- **Never hand-write or hand-edit `seed-content/provenance.json`.** It is what a publish *observed*, and a line
  typed into it by hand is indistinguishable from one the pipeline recorded. A card with no entry has no
  witness, and that is a true statement worth keeping.
- Never move a provider between lane and escape hatch, or add one, to get a run through. The registry
  (`src/shared/pool/providers/index.ts`) is a reviewed code change, not a lever in an authoring session.
- **Never silently tolerate a provider rewriting the prompt to get a blocked request through** (the retired
  AI Horde adapter's `replacement_filter` did exactly this). That kind of flag makes the refusal disappear by
  rewriting the prompt before anything sees it, with no signal anywhere in the response — you would then
  review an image drawn from words this project never sent, filed under a hash of the words it did. Any
  pinned request parameter on a current adapter is pinned for the same reason: it changes the bytes.
- **Never attach a payment method to an image-provider account, and never sign in to one that already
  has a card.** Recurring cost for this pipeline is $0, and the guarantee is the account state, not a
  budget: a card-free account can only ever refuse a request, whereas a carded one bills silently and you
  find out by invoice. A quota wall is the ceiling doing its job — wait it out, thin the run, or take it
  to the human. Upgrading the plan is never the fix.
