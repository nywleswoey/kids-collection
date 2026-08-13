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
| **Output** | 30 published cards, images reviewed, `seed/cards.json` committed on a branch, a PR open. |
| **Human checkpoints** | Exactly **two**: the 30-name list (Step 3), and the image contact sheet (Step 7). Stop dead at both — do not proceed on silence, and never answer them yourself. |
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

- **Theme name** — short, title-case, matching the existing set (*Animals*, *Mythic Creatures*,
  *Dinosaurs*, *Superheroes*, *Country*, *Famous People*, *Weird Insects*, *Special Plants*,
  *Spooky Legends*, *Deep Sea Creatures*, *Flying Machines*, *Ocean Machines*).
- **`eduText`** — true, simple, readable by a 7-year-old, ≤ 120 chars. For **fictional** subjects the
  fact is about the *story or folklore* ("Mary Shelley wrote Frankenstein at 18…") — never present
  fiction as fact.
- **`sourceUrl`** — a real, resolvable URL backing the fact. Wikipedia is fine. Parenthesised suffixes
  often 404; Step 5 catches it.
- **`imagePrompt`** — concrete, kid-friendly, **no art-style words**: `buildPrompt()` appends `ART_STYLE`
  for you. What works with this image model: name **one** subject ("a single …"), give a viewpoint ("side
  view"), put it somewhere plain ("parked on grass"). Sleek aircraft photographed in flight are the shape
  it most often renders as two overlapping copies.

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

Review files land at `seed/review/<theme-slug>-<card-slug>-<hash8>.jpg`, where the hash covers the *full*
prompt including `ART_STYLE`.

### Screen every image yourself, first

Open all 30 (`seed/review/<theme-slug>-*.jpg`) and look at each one. Reject on:

- **Two overlapping copies of the subject**, or a subject fused with scenery. The most common failure.
- Gore, damage, fire, combat, casualties — anything from the prohibited list above.
- Scary rather than friendly.
- Wrong subject, or unreadable mush.
- Text baked into the image (`ART_STYLE` asks for none; the model sometimes disagrees).

**To fix a reject, edit its `imagePrompt`** — deleting the file is not enough. The image service returns
the *same bytes for the same prompt* (verified: identical sha256 across calls), so deleting a review file
and re-running regenerates the picture you just rejected. Editing the prompt changes the content hash,
which both asks for a different picture and makes the stale review file stop matching. Delete the stale
file too, to keep the folder honest.

Then re-run `pnpm seed --review`. **Cap this at 2 re-prompt rounds.** If an image still fails, take it to
the human at the checkpoint with the problem named — do not swap the subject silently, and do not spend
the session fighting the model.

Amend the commit if you changed any `imagePrompt`.

## Step 7 — Build the contact sheet → **CHECKPOINT 2**

Generate one HTML page showing all 30 new images with their names and rarities, so the human reviews them
in one pass instead of opening a folder:

```bash
node -e '
const fs=require("fs"),p="seed/review";
const theme=process.argv[1];                       // exact theme name, e.g. "Ocean Machines"
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const cards=require("./seed/cards.json").themes.find(t=>t.name===theme).cards;
const files=fs.readdirSync(p).filter(f=>f.startsWith(slug(theme)+"-")&&f.endsWith(".jpg"));
const find=c=>files.find(f=>f.startsWith(slug(theme+"-"+c.name)+"-"));
const order={legendary:0,epic:1,rare:2,common:3};
const html=`<!doctype html><meta charset=utf-8><title>${theme} — review</title>
<style>body{font:14px system-ui;background:#111;color:#eee;margin:24px}
h1{font-size:20px}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
figure{margin:0}img{width:100%;border-radius:8px;display:block;background:#222}
figcaption{margin-top:6px}.r{opacity:.6;text-transform:uppercase;font-size:11px;letter-spacing:.08em}
.miss{color:#f66}</style><h1>${theme} — ${cards.length} new cards</h1><div class=g>` +
[...cards].sort((a,b)=>order[a.rarity]-order[b.rarity]).map(c=>{const f=find(c);
return `<figure>${f?`<img src="${f}" loading=lazy>`:`<div class=miss>NO IMAGE</div>`}
<figcaption><b>${c.name}</b><div class="r">${c.rarity}</div>
<div>${c.eduText}</div></figcaption></figure>`}).join("")+"</div>";
fs.writeFileSync(p+"/"+slug(theme)+"-review.html",html);
console.log("→ seed/review/"+slug(theme)+"-review.html");
' "<Theme Name>"
```

Give the human the file path, tell them anything you re-prompted and anything you are unsure about, and
**stop and wait for an explicit approval.** The human holds the kid-safety veto; your screening only
removes their grind, it does not replace them. `seed/review/*.html` is a local scratch artifact — do not
commit it.

## Step 8 — Publish

Only after approval:

```bash
pnpm seed --sync           # publishes the REVIEWED bytes -> Blob -> DB insert; idempotent
```

`--sync` is delta-only: it inserts new cards, updates text on existing ones, and republishes nothing it
does not have to. It refuses to insert any card lacking a reviewed image.

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
| Schema failure you cannot resolve without dropping below 30 cards or off the pyramid | The theme is not viable as scoped. That is a human call. |
| A `sourceUrl` you cannot make resolve for a subject you consider essential | Ditto. |
| An image still failing after 2 re-prompt rounds | Take it to the checkpoint, named. |
| `DATABASE_URL` / `BLOB_READ_WRITE_TOKEN` missing | Report it; do not go hunting for credentials. |

## Never

- Never remove or rename an existing theme or card. Removal from the seed file **prunes it from every
  child's collection**.
- Never reorder the `themes` array.
- Never pass `--allow-prune`, `--allow-unreviewed`, or `--reset`.
- Never answer a checkpoint on the human's behalf.
- Never edit `src/features/pool/seed-schema.ts` to make a theme fit. The theme bends, not the pyramid.
