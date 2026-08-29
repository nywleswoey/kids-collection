/**
 * PROTOTYPE — #124. Throwaway. Do not import this from anything.
 *
 * The question: do the seven WHOLE-TREE Trees cards — the 2 legendaries and the
 * 5 epics — read as distinct, identifiable trees at distance, or are they one
 * shape in five colours? And, folded in, do the four crop FAMILIES read as four
 * different kinds of object rather than four green rectangles?
 *
 * ── Why this run exists at all ──────────────────────────────────────────────
 * #116 split the theme by tier: 23 commons and rares draw as close crops, the 7
 * epics and legendaries draw as whole trees. The crop half is the half #116
 * measured and the whole-tree half is the half that FAILED there — Oak, Maple
 * and Ash collapsed into one generic broadleaf. That failed half is now the
 * tier carrying the theme's stature, and #119 allocated its silhouettes on
 * reasoning alone. This run is where that allocation is verified.
 *
 * ── The seven, and the outline each is spending ────────────────────────────
 *   Cherry Blossom Tree   spread      legendary — never drawn anywhere
 *   Banyan                spread      legendary — never drawn anywhere
 *   Weeping Willow        droop       epic
 *   Coconut Palm          palm        epic
 *   Joshua Tree           candelabra  epic
 *   Norway Spruce         conifer     epic
 *   Italian Cypress       columnar    epic
 *
 * Six outlines across seven cards. The two legendaries are the pair that shares
 * one — #117 spent both top slots on a broad spreading canopy, which is exactly
 * the outline #116 watched three species collapse into. So the sheet's first
 * job is a two-card comparison, not a seven-card one.
 *
 * ── Weeping Willow is drawn from #116's prompt, verbatim ────────────────────
 * It is the one of the seven #116 already drew, and it drew WELL. Keeping its
 * wording unchanged makes it a true control rather than an approximation: if
 * the willow regresses here, the run itself is suspect and no verdict about the
 * other six can be trusted. Every other prompt is new, because #119 named
 * subjects #116 never touched.
 *
 * ── Two samples per arm, not one ───────────────────────────────────────────
 * This is the change #120 forced and #127 is re-measuring #115 against. #120
 * drew one prompt three times at the same pinned seed and got three different
 * compositions; its own second samples turned three ambiguous arms into three
 * findings. A one-sample verdict on this lane cannot separate "this SUBJECT
 * draws badly" from "this DRAW was bad", and the ticket as written was a
 * one-sample run. So every arm gets a plain second sample — same prompt, drawn
 * again — and the sheet shows the pair side by side.
 *
 * Deliberately a REPEAT and not a repair: this run is a screen, and a repaired
 * prompt would answer "can wording save it" before "is it broken" has been
 * established. If an arm fails on both samples, the swap stock is where it goes
 * — Tembusu, Saga Tree, Cannonball Tree, Jackfruit Tree, Monkey Puzzle Tree,
 * Douglas Fir (Monkey Puzzle legendary-only: #119 refused it an epic slot
 * because its spiky cone crowds Joshua Tree).
 *
 * ── The four crops, added by #119 ──────────────────────────────────────────
 * #116 proved species separate AT a crop; it never showed that crops separate
 * from EACH OTHER. Twenty-three cards of "a green leaf, centred" is #115's
 * "gold vs copper nugget is one card recoloured" transposed one level down,
 * inside the tier the runbook calls this theme's strength. #119's mitigation is
 * a stated spread across what the crop shows, and it is asserted, not measured:
 *
 *   leaf-led    9 cards   Oak — #116's cleanest crop, so this is the CONTROL:
 *                         if Oak regresses, the framing is at fault, not the
 *                         subject list.
 *   fruit-led   7 cards   Rambutan Tree
 *   bark-led    4 cards   Rainbow Eucalyptus — the riskiest. A bark crop is
 *                         texture alone, and #115 measured that a subject with
 *                         no colour and no texture grows a face. This one has
 *                         colour by construction: it is the test of whether
 *                         that was enough.
 *   blossom-led 3 cards   Frangipani
 *
 * A failed family sends back that family's share of the 23, not the whole list.
 *
 * ── One deliberate departure from #116's verbatim wording, on Oak ──────────
 * #116's oak crop read "a close view of one oak branch…". The ticket asks all
 * four crops to carry #116's residual finding — subjects drifted to the edges
 * and Birch went plural, so write "a single branch". Those two instructions
 * conflict on Oak alone. The finding wins, because a control that does not
 * share the framing under test is not controlling for anything: all four crops
 * say "a single … branch", and Oak is a one-word step from #116 rather than a
 * copy of it. Worth knowing when reading its row.
 *
 * ── Cloudflare only ────────────────────────────────────────────────────────
 * #116 retired `pollinations` for Trees on measured evidence — landscape and
 * plural Birch, teal-on-teal Willow, three identical green domes for the hard
 * trio. #115 retired it for Metals independently. Spending its 15s-apart serial
 * cap on a lane already ruled out for exactly this subject matter buys nothing.
 *
 * ── What is deliberately NOT varied ────────────────────────────────────────
 * As #115, #116 and #120: `ART_STYLE` is IMPORTED, not copied, and the
 * Cloudflare param bag reproduces `cloudflare-sdxl.ts` exactly. An answer drawn
 * at different settings would not be an answer about the art the runbook gets.
 *
 * Every prompt carries #116's three wording findings: the species' defining
 * features are NAMED (2 of 5 plain-framing images spontaneously became trunk
 * close-ups — the default framing lets the lane pick the framing); every
 * subject gets "a single", because a subject that sounds singular but is not
 * draws a scene; and no noun names an object the picture could sit inside
 * (#81's residual, still nonzero on foliage at 2 of 15 with no frame noun in
 * the prompt, and caught by nothing but CHECKPOINT 2 — so look for borders).
 *
 * `seed/cards.json` is not touched and nothing is published.
 *
 *   pnpm prototype:124           draw everything; resumes, so an interrupt is cheap
 *   pnpm prototype:124 --sheet   rebuild the contact sheet from disk, draw nothing
 *
 * Output (gitignored scratch): seed/review/prototype-124/
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_SIZE } from "@/features/pool/providers";
import { ART_STYLE } from "@/features/pool/prompt";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-124");
const CF_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

/**
 * #115 returned a blank-but-valid 1.8 KB PNG once — a real 768x768 image, so
 * nothing in the seam caught it and only the human's eye did. Anything this
 * small is almost certainly that failure rather than a card.
 */
const BLANK_BYTES = 20_000;

const OUTDOORS = "on green grass under a blue sky";

type Subject = {
  slug: string;
  name: string;
  /** `tree` = the seven whole-tree cards. `crop` = #119's four crop families. */
  half: "tree" | "crop";
  /** The outline (trees) or the crop family (crops) this card is spending. */
  shape: string;
  tier?: "legendary" | "epic";
  /** Named risk, shown on the sheet so the reader knows what to look for. */
  risk: string;
  prompt: string;
};

const SUBJECTS: readonly Subject[] = [
  // ── The two legendaries. Never drawn anywhere, and they share one outline ─
  {
    slug: "cherry-blossom",
    name: "Cherry Blossom Tree",
    half: "tree",
    shape: "spread",
    tier: "legendary",
    risk: "identity is a mass of pink — #116 watched Maple's colour-only arm reduce to 'autumn colour'. Pink also attracts borders.",
    prompt: `a single cherry blossom tree with a dark curving trunk and a wide spreading crown completely covered in masses of soft pink flowers, ${OUTDOORS}`,
  },
  {
    slug: "banyan",
    name: "Banyan",
    half: "tree",
    shape: "spread",
    tier: "legendary",
    risk: "aerial roots on a spreading canopy is the 'sounds singular but isn't' class — the lane may draw a grove or a forest floor.",
    prompt: `a single banyan tree with one huge wide spreading crown and many thick aerial roots hanging down from its branches to the ground, ${OUTDOORS}`,
  },

  // ── The five epics, one outline each ─────────────────────────────────────
  {
    // #116's `whole-cued` willow prompt, VERBATIM. The control.
    slug: "willow",
    name: "Weeping Willow",
    half: "tree",
    shape: "droop",
    tier: "epic",
    risk: "control — #116 drew this well. A regression here impeaches the whole run, not the subject.",
    prompt: `a single weeping willow tree with a short thick trunk and long thin branches of narrow green leaves hanging down to the ground, ${OUTDOORS}`,
  },
  {
    slug: "coconut-palm",
    name: "Coconut Palm",
    half: "tree",
    shape: "palm",
    tier: "epic",
    risk: "palms are the pool's beach cliche — watch for a scene with sand and sea rather than one tree.",
    prompt: `a single coconut palm tree with one tall curving bare trunk and a crown of long feathery green fronds with green coconuts underneath, ${OUTDOORS}`,
  },
  {
    slug: "joshua-tree",
    name: "Joshua Tree",
    half: "tree",
    shape: "candelabra",
    tier: "epic",
    risk: "the only arm on sandy ground rather than grass — a desert cues a landscape, which is how #115's ore arm failed.",
    prompt:
      "a single joshua tree with a short thick shaggy trunk and crooked upward arms each ending in a spiky green tuft, on pale sandy ground under a blue sky",
  },
  {
    slug: "norway-spruce",
    name: "Norway Spruce",
    half: "tree",
    shape: "conifer spire",
    tier: "epic",
    risk: "the two narrow dark-green outlines are each other's nearest neighbour — read this against Italian Cypress, not against the broadleaves.",
    prompt: `a single norway spruce tree shaped like a tall narrow pointed cone, with dense dark green needle branches reaching down to the ground, ${OUTDOORS}`,
  },
  {
    slug: "italian-cypress",
    name: "Italian Cypress",
    half: "tree",
    shape: "columnar",
    tier: "epic",
    risk: "as above — and cypresses are a Tuscan-avenue cliche, so watch for a row of them.",
    prompt: `a single italian cypress tree shaped like a very tall narrow column of dense dark green foliage from top to bottom, ${OUTDOORS}`,
  },
  {
    // Added mid-run. Italian Cypress failed on both samples — sample 1 drew a
    // wallpaper of floating trees, sample 2 drew a broad layered conifer and
    // relegated the actual cypress columns to a background row — so the
    // columnar slot is vacant and the human swapped it out.
    //
    // #119 had refused Monkey Puzzle an epic slot on the stated grounds that
    // "its spiky cone crowds Joshua Tree". That call was made with no picture
    // of either tree. This run has two of Joshua, and it drew as a PALE,
    // SPARSE, SAND-COLOURED candelabra; Monkey Puzzle is a dense dark green
    // spiky umbrella on a bare straight trunk. So the refusal is re-opened on
    // evidence rather than overridden — and re-opening it is only honest if
    // the replacement is screened to the same standard as the seven it joins,
    // which is the whole reason this ticket exists.
    slug: "monkey-puzzle",
    name: "Monkey Puzzle Tree",
    half: "tree",
    shape: "spiky umbrella (replaces columnar)",
    tier: "epic",
    risk: "the crowding #119 alleged: read it against Joshua Tree, not against the broadleaves. Also a candidate for the wallpaper failure, being another repeating-geometry subject like the cypress that just failed.",
    prompt: `a single monkey puzzle tree with a bare straight trunk and stiff branches covered in sharp overlapping dark green triangular scales, ${OUTDOORS}`,
  },

  // ── #119's four crop families, one representative each ───────────────────
  {
    slug: "crop-oak",
    name: "Oak (leaf-led)",
    half: "crop",
    shape: "leaf-led — 9 of 23",
    risk: "the control. #116's cleanest crop; if it regresses the framing is at fault, not the subject list.",
    prompt:
      "a single oak branch with lobed green leaves and two brown acorns, blue sky behind",
  },
  {
    slug: "crop-rambutan",
    name: "Rambutan Tree (fruit-led)",
    half: "crop",
    shape: "fruit-or-seed-led — 7 of 23",
    risk: "a fruit cluster is plural by nature — the #115 class. The branch is the singular head noun holding it together.",
    prompt:
      "a single rambutan branch with a cluster of round bright red fruit covered in soft green hairs, blue sky behind",
  },
  {
    slug: "crop-eucalyptus",
    name: "Rainbow Eucalyptus (bark-led)",
    half: "crop",
    shape: "bark-led — 4 of 23",
    risk: "the riskiest. Bark is texture alone; #115 measured that colour-and-texture-free subjects grow a face, and #120 that a flat subject with no named edge returns a texture rather than a card.",
    prompt:
      "a single tall rainbow eucalyptus trunk standing on green grass, its whole smooth surface streaked in bright green, orange, purple and blue, blue sky behind",
  },
  {
    slug: "crop-frangipani",
    name: "Frangipani (blossom-led)",
    half: "crop",
    shape: "blossom-led — 3 of 23",
    risk: "blossom on bare stems is close to Cherry Blossom's whole-tree card — check across halves, not just within this one.",
    prompt:
      "a single frangipani branch with clusters of white five-petalled flowers with yellow centres on a bare grey stem, blue sky behind",
  },
] as const;

/** Every arm is drawn twice. `-b` is the same prompt, drawn again. */
const SAMPLES = ["a", "b"] as const;
type Sample = (typeof SAMPLES)[number];

function fileFor(slug: string, sample: Sample): string {
  return join(OUT_DIR, `${slug}--${sample}.png`);
}

/** `cloudflare-sdxl.ts`'s pinned param bag, reproduced. */
async function draw(s: Subject, sample: Sample): Promise<void> {
  const file = fileFor(s.slug, sample);
  if (existsSync(file)) return;

  const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${s.prompt}, ${ART_STYLE}`,
        width: CARD_SIZE.width,
        height: CARD_SIZE.height,
        num_steps: 20,
        guidance: 7.5,
        seed: 42,
      }),
    },
  );
  if (!res.ok) {
    console.log(`FAIL  ${s.slug}--${sample} — HTTP ${res.status}`);
    return;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(file, bytes);
  const flag =
    bytes.byteLength < BLANK_BYTES ? "  <-- SUSPECT BLANK, re-roll (#115)" : "";
  console.log(
    `ok    ${`${s.slug}--${sample}`.padEnd(22)} ${String(bytes.byteLength).padStart(8)}B${flag}`,
  );
}

// ── The contact sheet ───────────────────────────────────────────────────────
//
// HTML with <img> tags, as #74, #81, #115, #116, #120 and `contact-sheet.ts` do
// it. Composing a montage would need an image decoder, and `pnpm-workspace.yaml`
// pins `sharp` on the express grounds that this repo's own code never invokes
// it — a prototype importing it would retire that argument for nothing.

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function img(slug: string, sample: Sample, caption: string): string {
  return existsSync(fileFor(slug, sample))
    ? `<figure><img src="${esc(slug)}--${sample}.png" loading="lazy"><figcaption>${esc(caption)}</figcaption></figure>`
    : `<figure class="miss">—<figcaption>${esc(caption)}</figcaption></figure>`;
}

/** One arm, both samples, its shape and its named risk. */
function row(s: Subject): string {
  return `<h3>${esc(s.name)} — <span class=sh>${esc(s.shape)}</span>${s.tier === "legendary" ? " <span class=lg>legendary</span>" : ""}</h3>
    <div class=strip>${img(s.slug, "a", "sample 1")}${img(s.slug, "b", "sample 2")}</div>
    <div class=pr>${esc(s.prompt)}</div>
    <div class=rk>watch for: ${esc(s.risk)}</div>`;
}

function sheet(): void {
  const trees = SUBJECTS.filter((s) => s.half === "tree");
  const crops = SUBJECTS.filter((s) => s.half === "crop");

  // VIEW 1 — the binder strip, whole-tree half. Sample 1 of all seven adjacent,
  // the way a binder page is scanned. This is the headline count: how many
  // outlines can you actually tell apart. Six are claimed.
  const stripA = trees
    .map((s) => img(s.slug, "a", `${s.name} — ${s.shape}`))
    .join("");
  const stripB = trees
    .map((s) => img(s.slug, "b", `${s.name} — ${s.shape}`))
    .join("");

  // VIEW 2 — the two legendaries, head to head. #117 spent both top slots on
  // the same outline. If they are one card, one of them goes to swap stock and
  // the flavour contrast — a MOMENT vs a PLACE — has to survive the swap.
  const legends = SUBJECTS.filter((s) => s.tier === "legendary")
    .map((s) => row(s))
    .join("");

  // VIEW 3 — the narrow pair. Norway Spruce and Italian Cypress are the two
  // arms most at risk of being each other: both tall, narrow and dark green.
  // #119 spent two of five epic slots on them.
  const narrow = `<div class=strip>${img("norway-spruce", "a", "Norway Spruce — conifer spire")}${img("italian-cypress", "a", "Italian Cypress — columnar")}${img("norway-spruce", "b", "spruce, sample 2")}${img("italian-cypress", "b", "cypress, sample 2")}</div>`;

  // VIEW 4 — every whole-tree arm, both samples, with its risk stated.
  const treeRows = trees.map((s) => row(s)).join("");

  // VIEW 5 — the crop families. Four kinds of object, or four green rectangles.
  const cropStrip = crops
    .map((s) => img(s.slug, "a", `${s.name}`))
    .concat(crops.map((s) => img(s.slug, "b", `${s.name}, sample 2`)))
    .join("");
  const cropRows = crops.map((s) => row(s)).join("");

  const html = `<!doctype html><meta charset=utf-8><title>#124 — do the seven whole trees read at distance?</title>
<style>
body{font:14px/1.5 system-ui;margin:2rem;background:#111;color:#eee}
img{width:230px;height:230px;display:block}
.strip{display:flex;flex-wrap:wrap;gap:6px;margin:.25rem 0 1.25rem}
figure{margin:0;font-size:11px;color:#888;text-align:center}
figure.miss{color:#555;width:230px;height:230px;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px dashed #333}
h1,h2,h3{font-weight:600}
h2{border-top:1px solid #333;padding-top:1rem;margin-top:2rem}
h3{margin-bottom:.25rem;font-size:13px;color:#9a9}
.sh{color:#c96;font-weight:400}
.lg{color:#d8a;font-weight:400}
.q{color:#ccc;max-width:56rem}
.pr{color:#9a9;font-style:italic;font-size:12px;max-width:60rem;margin:-.9rem 0 .35rem}
.rk{color:#a88;font-size:12px;max-width:60rem;margin-bottom:1.5rem}
code{color:#7a9}
</style>
<h1>#124 — do the seven whole-tree cards read at distance, or are they one shape in five colours?</h1>
<p class=q>22 images, Cloudflare only (#116 retired <code>pollinations</code> for Trees, #115 for Metals).
<b>Two samples per arm</b>, the same prompt drawn twice — #120 measured that this lane draws the same
prompt at the same pinned seed three different ways, so a single image cannot separate <em>this subject
draws badly</em> from <em>this draw was bad</em>. <b>Weeping Willow is #116's prompt verbatim</b> and is
the run's control: if it regresses, distrust the run before the subject list.</p>

<h2>1 — The binder strip: how many outlines are actually there?</h2>
<p class=q>#119 allocated six outlines across seven cards — <b>spread &times;2, droop, palm, candelabra,
conifer spire, columnar</b> — on reasoning, never on a picture. Scan each row the way a binder page is
scanned and count the shapes you can tell apart with the captions covered. #116 watched Oak, Maple and Ash
collapse into one generic broadleaf at exactly this framing, and this is the tier that carries the theme's
stature.</p>
<h3>Sample 1</h3><div class=strip>${stripA}</div>
<h3>Sample 2</h3><div class=strip>${stripB}</div>

<h2>2 — The two legendaries</h2>
<p class=q>Neither was ever drawn. #117 picked them on cultural stature and screened them on reasoning, and
spent <b>two of the seven slots on the same outline</b> — the broad spreading canopy. They are meant to
differ on three axes at once: a <em>moment</em> vs. a <em>place</em>, delicate vs. massive, a tree you look
at vs. one you stand inside. If either fails, the swap stock is Tembusu, Saga Tree, Cannonball Tree,
Jackfruit Tree, Monkey Puzzle Tree, Douglas Fir — and the swap must preserve that contrast, not just fill
the slot.</p>
${legends}

<h2>3 — The narrow pair</h2>
<p class=q>Two of the five epic slots went to tall, narrow, dark green trees. This is where &ldquo;one shape
in five colours&rdquo; would show up inside the epic tier itself.</p>
${narrow}

<h2>4 — Every whole tree, both samples</h2>
<p class=q>Per subject: does the whole tree read at distance, and is it distinguishable from the other six.
Also look for <b>borders</b> — #116 found 2 of 15 Cloudflare images came back framed with no frame noun in
the prompt (#81's residual), and nothing but CHECKPOINT 2 catches it.</p>
${treeRows}

<h2>5 — The four crop families</h2>
<p class=q>#116 proved species separate <em>at</em> a crop; it never showed crops separate from
<em>each other</em>. Twenty-three of the thirty cards are crops, and #119's spread across what the crop
shows — <b>9 leaf-led / 7 fruit-or-seed-led / 4 bark-led / 3 blossom-led</b> — is asserted, not measured.
Do these read as four different kinds of object, or four green rectangles? A failed family sends back that
family's share of the 23, not the whole list. Every prompt says <b>&ldquo;a single … branch&rdquo;</b>,
#116's residual crop-composition finding, and this is the first look at whether that wording holds.</p>
<div class=strip>${cropStrip}</div>
${cropRows}`;

  const out = join(OUT_DIR, "sheet.html");
  writeFileSync(out, html);
  console.log(`sheet ${out}`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  if (process.argv.slice(2).includes("--sheet")) return sheet();
  for (const s of SUBJECTS) for (const sample of SAMPLES) await draw(s, sample);
  sheet();
}

void main();
