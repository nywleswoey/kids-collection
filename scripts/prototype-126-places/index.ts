/**
 * PROTOTYPE — #126. Throwaway. Do not import this from anything.
 *
 * The question: do PLACES draw as distinct cards, and how many silhouettes do
 * they actually add on top of the object families already on record?
 *
 * ── Why this arm is load-bearing ───────────────────────────────────────────
 * #120 measured the widening past metals and found it buys three new object
 * silhouettes — geode, cut gem, polished disc — each only about two slots deep,
 * because the variation inside an object family is COLOUR: emerald vs sapphire
 * is one card recoloured, a geode varies by interior colour, a slab by band
 * colour. #127 then dropped the poured-metal family outright (a pour is an
 * action, not an object), leaving FIVE object families at ~2 slots ≈ about ten
 * of the fifteen commons. The theme is roughly FIVE commons short.
 *
 * The one image in #120 whose distinctness did not come from a colour was the
 * place arm: a crystal-lined cave. The human ruled places in rather than resting
 * the gap-closing lever on a single draw — which is exactly the one-sample
 * standard #120's own repeat probe undermined.
 *
 * So the arithmetic question, asked of places specifically: is a place a family
 * worth two slots like every object family, or is it a family whose depth is
 * SHAPE rather than colour? A cave, a mine face, a vein in a cliff, a canyon
 * wall and a sea cliff are plausibly five silhouettes. If they are, the common
 * tier is reachable and the theme has an apex. If they are five brown walls,
 * the widening has run out of road and that has to reach the human before the
 * theme's edge is drawn in #121.
 *
 * ── Two samples per arm, not one ──────────────────────────────────────────
 * #120 measured that the same prompt at the same pinned seed draws three
 * different compositions, and its own second samples converted three ambiguous
 * results into three findings. #127 then settled the standing rule: SCREEN
 * SHAPES AT ONE SAMPLE, BUT NEVER STATE A SUPERLATIVE OR A NAMED FAILURE MODE
 * WITHOUT AT LEAST TWO. This run is making both kinds of claim — a shape count
 * AND, if the arms fail, named failure modes — so every arm reaches two.
 *
 * The two #120 arms that are re-used here are counted rather than re-drawn:
 * `cave` and the `geode` control each already have one sample on disk, so each
 * needs one more. Their prompts are #120's VERBATIM — changing a word would
 * make the second image a different subject rather than a second sample.
 *
 * ── The geode control ──────────────────────────────────────────────────────
 * "These are different cards" cannot be read in the abstract. One of #120's
 * confirmed object silhouettes is drawn alongside, so distinctness is read
 * against a known-distinct OBJECT — and so the answer can say whether a place
 * reads as a *card* beside an object at all, which is the prior question to how
 * many places there are. The geode is the obvious choice: #120 called it the
 * best card in that set.
 *
 * ── The wording findings this run carries ─────────────────────────────────
 * #120 and #127 left three rules, and the place framing interacts with all of
 * them:
 *
 *   1. PLURALITY IS THIS TERRITORY'S SIGNATURE FAILURE, and `"a single"` does
 *      not fix it — the head noun must be a whole solid object. A place has no
 *      such noun. That is not a wording bug to route around here; it is
 *      PRECISELY THE RISK THIS TICKET IS MEASURING, so no arm is given a fake
 *      object noun to hide behind. What each place gets instead is its EXTENT
 *      and its VIEWPOINT asserted, which is the nearest available analogue.
 *   2. FLAT OR CUT SUBJECTS NEED THEIR EDGE NAMED, or the lane returns a
 *      texture rather than a card — #120's slab drew abstract wallpaper twice
 *      until `its whole rounded edge visible` was added. Four of these five
 *      arms are flat vertical faces, so each names how much of the face is in
 *      frame.
 *   3. A SMOOTH FEATURELESS LUMP GROWS A FACE, WHATEVER COLOUR IT IS (#127's
 *      correction to #115's palette rule; copper has colour and grew one). The
 *      sea-cliff and vein arms are grey, so what protects them is NAMED
 *      TEXTURE and a NAMED EDGE, not a colour.
 *
 * And one artefact to watch for that nothing automated catches: #127 named the
 * ISOMETRIC DIORAMA — three independent arms across #120 and #127 put the
 * subject on a floating isometric grass or stone tile, a game asset rather than
 * a card. A place is the subject most likely to be built as a little diorama,
 * so it is called out on the sheet.
 *
 * ── Cloudflare only ───────────────────────────────────────────────────────
 * #115 retired `pollinations` for this subject matter and #116 for foliage.
 * Re-measuring a lane already ruled out answers a question nobody is asking.
 *
 * ── What is deliberately NOT varied ───────────────────────────────────────
 * As #115, #116, #120, #124 and #127: `ART_STYLE` is IMPORTED, not copied, and
 * the Cloudflare param bag reproduces `cloudflare-sdxl.ts` exactly — including
 * `seed: 42`. Same words, same seed, same settings, different pictures.
 *
 * `seed/cards.json` is not touched and nothing is published.
 *
 *   pnpm prototype:126           draw the first pass; resumes, so an interrupt is cheap
 *   pnpm prototype:126 --retry   draw the retry pass only (repairs, written after pass 1)
 *   pnpm prototype:126 --sheet   rebuild the contact sheet from disk, draw nothing
 *
 * Output (gitignored scratch): seed/review/prototype-126/
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_SIZE } from "@/features/pool/providers";
import { ART_STYLE } from "@/features/pool/prompt";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-126");
const CF_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

/**
 * #115 and #127 both hit a blank-but-valid ~1.8 KB PNG — a real 768x768 image,
 * so nothing in the seam catches it and only a byte-size check does. #127
 * settled that it is a LANE fault, not a subject fault: it landed on the silver
 * bar, #115's best-working shape. So every generation is checked, not just the
 * ones judged risky.
 */
const BLANK_BYTES = 20_000;

/** A sample already on disk from an earlier run, shown without copying bytes. */
type Prior = { src: string; from: string };

type Arm = {
  slug: string;
  /** Shown on the sheet: what shape this is claiming to be. */
  family: string;
  /** `control` = a #120-confirmed OBJECT family. `place` = the thing on trial. */
  kind: "control" | "place";
  /** What this arm is meant to add that the others cannot reach. */
  claim: string;
  prompt: string;
  prior: readonly Prior[];
  /** How many this run draws to bring the arm to two samples. */
  draws: number;
};

const ARMS: readonly Arm[] = [
  // ── The object control, #120's prompt verbatim ────────────────────────────
  {
    slug: "control-geode",
    family: "split geode (OBJECT control)",
    kind: "control",
    claim:
      "a known-distinct object, so 'these are different cards' is read against something rather than in the abstract",
    prompt:
      "a single hollow round geode rock split open to show the purple crystal points lining its inside, on green grass",
    prior: [{ src: "../prototype-120/geode.png", from: "#120" }],
    draws: 1,
  },

  // ── The place arms ───────────────────────────────────────────────────────
  {
    // #120's arm, verbatim, for its second sample. The whole ticket exists
    // because this one image was the only non-colour distinctness in that run.
    slug: "cave",
    family: "cave interior",
    kind: "place",
    claim: "an interior you are inside — a natural enclosing space",
    prompt:
      "the inside of a rocky cave with tall pointed pale purple crystals growing out of its floor and walls",
    prior: [{ src: "../prototype-120/cave.png", from: "#120" }],
    draws: 1,
  },
  {
    // A WORKED wall underground, against the cave's natural one. If these two
    // land on one image, "interior" is one silhouette and not two.
    slug: "mine-face",
    family: "mine face",
    kind: "place",
    claim: "an interior that is worked rather than natural — cut, straight, tooled",
    prompt:
      "the flat cut rock wall at the end of an underground mine tunnel, its whole face visible from top to bottom, straight tool grooves across the stone and a seam of glittering silver ore running through it, wooden support beams at either side",
    prior: [],
    draws: 2,
  },
  {
    // Outdoors and vertical, where cave and mine face are interiors. The
    // mineral is a feature of the cliff, per #120's demote-the-mineral rule.
    slug: "vein-cliff",
    family: "vein in a cliff",
    kind: "place",
    claim: "outdoors and vertical — a face seen from outside rather than within",
    prompt:
      "a wide band of bright blue-green mineral running in a stripe across a rough grey rock cliff face outdoors in daylight, the whole cliff face filling the picture, its cracked stone texture lit from the side",
    prior: [],
    draws: 2,
  },
  {
    // The widest, most distant framing. #124 found that a habitat cues a
    // landscape; this arm IS a landscape, deliberately, to test whether a place
    // survives being one.
    slug: "canyon-wall",
    family: "canyon wall",
    kind: "place",
    claim: "the widest framing — tests whether a place survives being a landscape",
    prompt:
      "a tall canyon wall of layered orange and red rock rising above a dry stony riverbed, seen from the canyon floor in daylight, its horizontal rock layers clearly visible from top to bottom",
    prior: [],
    draws: 2,
  },
  {
    // A place whose SUBJECT is the banding — the same thing #120's polished
    // disc is about, at place scale. If this reads as the disc's card, banding
    // is one family however it is framed.
    slug: "sea-cliff",
    family: "banded sea cliff",
    kind: "place",
    claim:
      "a place whose subject is banding — set directly against #120's polished disc",
    prompt:
      "a steep sea cliff of banded rock rising straight out of calm blue water, its whole face visible with level stripes of cream and dark grey stone across a rough weathered surface",
    prior: [],
    draws: 2,
  },
] as const;

/**
 * The object silhouettes already on record, read off disk from #115's and
 * #120's runs. Not re-drawn — this strip exists so the place arms can be
 * counted AGAINST what the theme already has, which is the arithmetic the
 * ticket actually asks about.
 */
const OBJECTS: readonly { src: string; family: string; from: string }[] = [
  { src: "../prototype-120/control-lump.png", family: "lump", from: "#115/#120" },
  { src: "../prototype-120/control-bar.png", family: "bar", from: "#115/#120" },
  { src: "../prototype-120/control-crystal.png", family: "crystal", from: "#115/#120" },
  { src: "../prototype-120/geode.png", family: "geode", from: "#120" },
  { src: "../prototype-120/gem-ruby.png", family: "cut gem", from: "#120" },
  { src: "../prototype-120/slab-fix.png", family: "polished disc (repaired)", from: "#120" },
];

/**
 * The retry pass, in #120's shape. Two samples per arm already answer "was it
 * the draw?", so unlike #120 there are no `-b` rows here — only repairs.
 *
 * ── What pass 1 showed, and why one repair covers three arms ───────────────
 * `mine-face`, `vein-cliff` and `sea-cliff` all failed on BOTH samples, and
 * they failed the same way: the picture became a **texture** — tiling stone
 * brick, a close-up of banded rock, abstract horizontal stripes — with no
 * object boundary anywhere in frame. `cave` and `canyon-wall` did not, and the
 * difference between the two groups is not the subject. It is the FRAMING each
 * prompt asked for.
 *
 * Every failed prompt carried an edge phrase — `its whole face visible from top
 * to bottom`, `the whole cliff face filling the picture`, `its whole face
 * visible`. Those were #120's rule applied faithfully: a flat or cut subject
 * must have its edge named, or the lane returns a texture. On the `slab` it
 * worked. Here it did the opposite of what it did there, and the reason is
 * that the rule silently assumes a DISCRETE OBJECT. `Its whole edge visible`
 * bounds a slab, because a slab has an edge and beyond it is grass. A rock face
 * has no edge at the scale the prompt named, so `its whole face filling the
 * picture` is an instruction to fill the frame with wall — which is the texture,
 * exactly as asked.
 *
 * The two arms that worked both put the place inside something larger: the cave
 * has a mouth and a floor, the canyon has sky above and a riverbed below. So
 * the repair moves in the OPPOSITE direction from #120's — it pulls BACK and
 * gives the place an outline against sky and ground, rather than pressing in to
 * find its edge. If that recovers all three, the rule #118 carries is a place
 * rule, not a wording tweak; if it recovers none, places are worth what pass 1
 * says they are worth and no more.
 *
 * Two samples per repair, for the same reason every arm got two: a repair that
 * recovers is a positive claim about wording, and #127's standard does not let
 * one image carry that.
 */
type Retry = { slug: string; of: string; why: string; fix: string; draws: number };

const RETRIES: readonly Retry[] = [
  // Sample 1 drew a receding tunnel — a cave by another name, no tool marks and
  // no ore. Sample 2 drew tiling stone brickwork. The repair keeps the worked
  // cues but frames the wall as the END of a space you are standing in, so the
  // tunnel bounds it instead of the frame edge.
  {
    slug: "mine-face-fix",
    of: "mine-face",
    why: "the wall bounded by the tunnel around it, not by the frame edge; worked cues kept",
    fix: "a rock wall at the far end of a short underground mine tunnel, seen from inside the tunnel with its dark walls and roof framing the view on all sides, wooden support beams and a rail track on the tunnel floor leading up to it, a bright seam of silver ore across the cut stone",
    draws: 2,
  },
  // Both samples were close-ups of rock with a coloured band — a texture with no
  // cliff in it. The repair pulls back until the cliff has an outline: sky above,
  // ground below, the whole formation standing in a landscape.
  {
    slug: "vein-cliff-fix",
    of: "vein-cliff",
    why: "pulled back so the cliff has an outline against sky and ground",
    fix: "a single tall grey rock cliff standing alone in a green grassy field under a clear blue sky, a wide stripe of bright blue-green mineral running down its rough face from top to bottom, seen from a distance so the whole cliff and the sky above it are in the picture",
    draws: 2,
  },
  // Both samples were abstract horizontal stripes — the banding with no cliff and
  // no sea. Same repair as the vein: the banding demoted to a feature of a whole
  // formation, and the formation given a horizon to stand against.
  {
    slug: "sea-cliff-fix",
    of: "sea-cliff",
    why: "banding demoted to a feature of a whole formation given a horizon to stand against",
    fix: "a single tall sea cliff standing at the edge of calm blue water under a clear sky, its rough face striped with level layers of cream and dark grey stone, seen from a distance so the whole cliff, the water below it and the sky above it are all in the picture",
    draws: 2,
  },
] as const;

function fileFor(slug: string, n?: number): string {
  return join(OUT_DIR, n === undefined ? `${slug}.png` : `${slug}--${n}.png`);
}

/** `cloudflare-sdxl.ts`'s pinned param bag, reproduced. */
async function generate(prompt: string, file: string, label: string): Promise<void> {
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
        prompt: `${prompt}, ${ART_STYLE}`,
        width: CARD_SIZE.width,
        height: CARD_SIZE.height,
        num_steps: 20,
        guidance: 7.5,
        seed: 42,
      }),
    },
  );
  if (!res.ok) {
    console.log(`FAIL  ${label} — HTTP ${res.status}`);
    return;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(file, bytes);
  const flag =
    bytes.byteLength < BLANK_BYTES ? "  <-- SUSPECT BLANK, re-roll (#127)" : "";
  console.log(
    `ok    ${label.padEnd(22)} ${String(bytes.byteLength).padStart(8)}B${flag}`,
  );
}

// ── The contact sheet ───────────────────────────────────────────────────────

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fig(src: string, cap: string, cls = ""): string {
  if (!src) return `<figure class="miss">—<figcaption>${esc(cap)}</figcaption></figure>`;
  const disk = join(OUT_DIR, src);
  if (!existsSync(disk))
    return `<figure class="miss">—<figcaption>${esc(cap)}</figcaption></figure>`;
  const small = statSync(disk).size < BLANK_BYTES ? " · BLANK?" : "";
  return `<figure class="${cls}"><img src="${esc(src)}" loading="lazy"><figcaption>${esc(cap + small)}</figcaption></figure>`;
}

/** Every sample of one arm, oldest first, provenance labelled. */
function samples(a: Arm): string[] {
  const olds = a.prior.map((p, i) => fig(p.src, `sample ${i + 1} — ${p.from}`, "old"));
  const news = Array.from({ length: a.draws }, (_, i) =>
    fig(`${a.slug}--${i + 1}.png`, `sample ${a.prior.length + i + 1} — #126`, "new"),
  );
  return [...olds, ...news];
}

/** The newest sample of an arm — what the arm looks like as of this run. */
function newest(a: Arm): string {
  return a.draws > 0
    ? `${a.slug}--${a.draws}.png`
    : (a.prior[a.prior.length - 1]?.src ?? "");
}

function armRow(a: Arm): string {
  return `<h3>${esc(a.family)} <span class=n>· ${a.prior.length + a.draws} samples</span></h3>
    <div class=v>${esc(a.claim)}</div>
    <div class=strip>${samples(a).join("")}</div>
    <div class=pr>${esc(a.prompt)}</div>`;
}

function retryRow(r: Retry): string {
  const of = ARMS.find((a) => a.slug === r.of);
  if (!of) return "";
  const fixes = Array.from({ length: r.draws }, (_, i) =>
    fig(`${r.slug}--${i + 1}.png`, `repaired — sample ${i + 1}`, "fix"),
  ).join("");
  return `<h3>${esc(of.family)} <span class=n>· repair</span></h3>
    <div class=v>${esc(r.why)}</div>
    <div class=strip>${samples(of).join("")}${fixes}</div>
    <div class=pr>${esc(r.fix)}</div>`;
}

function sheet(): void {
  const places = ARMS.filter((a) => a.kind === "place");
  const control = ARMS.find((a) => a.kind === "control");

  // VIEW 1 — the card test. Every arm's newest sample in one strip, the object
  // control among them. Read left to right and ask two things in order: does a
  // place read as a CARD beside an object at all, and how many DIFFERENT cards
  // are in this strip?
  const cardTest = ARMS.map((a) =>
    fig(newest(a), a.family, a.kind === "control" ? "ctrl" : "new"),
  ).join("");

  // VIEW 2 — the arithmetic. The object silhouettes already on record, then the
  // places. The whole ticket is the second row's count.
  const objectStrip = OBJECTS.map((o) => fig(o.src, `${o.family} — ${o.from}`, "old")).join("");
  const placeStrip = places.map((a) => fig(newest(a), a.family, "new")).join("");

  // VIEW 3 — does each arm agree with ITSELF? The failure a one-sample method
  // cannot see, and the one that costs #118 the most.
  const rows = ARMS.map(armRow).join("");

  const retries = RETRIES.length
    ? `<h2>5 — The retry pass: the framing, or the wording?</h2>
<p class=q>Each row is an arm that failed on <b>both</b> samples, followed by the wording
<b>repaired</b> and drawn twice. Two samples have already ruled out "it was the draw", so what is left is:
is this family <b>unusable</b>, or usable at the cost of a rule
<a href="https://github.com/nywleswoey/kids-collection/issues/118">#118</a> must carry into every place
subject? All three failed the same way — the picture became a <b>texture</b> with no boundary anywhere in
frame — and all three prompts carried an <b>edge phrase</b>, which is #120's rule applied faithfully.
That rule assumes a <b>discrete object</b>: <em>its whole edge visible</em> bounds a slab because beyond
the edge is grass, but a rock face has no edge at that scale, so <em>filling the picture</em> is an
instruction to fill the frame with wall. The two arms that worked both sit inside something larger — the
cave has a mouth and a floor, the canyon has sky and a riverbed. <b>So the repair pulls BACK</b> and gives
the place an outline against sky and ground, which is the opposite move from #120's.</p>${RETRIES.map(retryRow).join("")}`
    : "";

  const html = `<!doctype html><meta charset=utf-8><title>#126 — do places draw as distinct cards?</title>
<style>
body{font:14px/1.5 system-ui;margin:2rem;background:#111;color:#eee}
img{width:215px;height:215px;display:block}
.strip{display:flex;flex-wrap:wrap;gap:6px;margin:.25rem 0 1rem}
figure{margin:0;font-size:11px;color:#888;text-align:center}
figure.old figcaption{color:#777}
figure.new figcaption{color:#6b9}
figure.ctrl figcaption{color:#c96}
figure.fix figcaption{color:#a9c}
figure.ctrl img,figure.fix img{outline:2px solid currentColor;outline-offset:-2px}
figure.miss{color:#555;width:215px;height:215px;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px dashed #333}
h1,h2,h3{font-weight:600}
h2{border-top:1px solid #333;padding-top:1rem;margin-top:2rem}
h3{margin-bottom:.15rem;font-size:13px;color:#9a9}
.n{color:#666;font-weight:400}
.q{color:#ccc;max-width:58rem}
.v{color:#c96;font-size:12px;margin-bottom:.35rem}
.pr{color:#788;font-style:italic;font-size:12px;max-width:60rem;margin:-.7rem 0 1.5rem}
code{color:#7a9}
a{color:#7a9}
</style>
<h1>#126 — do places draw as distinct cards, and how many shapes do they add?</h1>
<p class=q>Five object families at ~2 slots each ≈ <b>ten of the fifteen commons</b>
(<a href="https://github.com/nywleswoey/kids-collection/issues/120">#120</a> found six; #127 dropped the
pour). The theme is <b>about five commons short</b>, and places are the last lever. Every arm is drawn
<b>twice</b> — #127's standard: screen shapes at one sample, but never state a superlative or a named
failure mode without two. <code>cave</code> and the <span style="color:#c96">geode control</span> carry
#120's prompt <b>verbatim</b> and re-use its image as sample 1, so those rows are true two-sample rows
without re-drawing what exists. Cloudflare only; <code>seed/cards.json</code> untouched.</p>
<p class=q><b>Watch for the isometric diorama</b> — #127 named it after three arms across #120 and #127
rendered the subject on a floating isometric tile. A place is the subject most likely to be built as a
little diorama, and nothing automated catches it.</p>

<h2>1 — The card test: does a place read as a card beside an object?</h2>
<p class=q>Newest sample of every arm, the <span style="color:#c96">object control</span> among them.
Two questions in order, because the second is meaningless without the first: <b>does a place read as a
card at all</b> beside a known-distinct object — or does it read as a background, a scene, a wallpaper?
Then: <b>how many different cards are in this strip?</b></p>
<div class=strip>${cardTest}</div>

<h2>2 — The arithmetic: places on top of what the theme already has</h2>
<p class=q>The top strip is the <b>object silhouettes already on record</b> from #115 and #120, not
re-drawn. The bottom strip is the places. The ticket's whole question is the bottom row's count:
<b>how many silhouettes do places add that the object framing cannot reach?</b> At ~2 slots per family,
the theme needs places to be worth <b>two or three families</b> for the 15-card common tier to close.</p>
<h3>Object silhouettes on record</h3><div class=strip>${objectStrip}</div>
<h3>Places, newest sample of each</h3><div class=strip>${placeStrip}</div>

<h2>3 — Depth: is a place's variation shape, or is it colour like an object's?</h2>
<p class=q>The reason an object family is only ~2 slots deep is that the variation <em>inside</em> it is
colour — emerald vs sapphire is one card recoloured. The places above differ on <b>enclosure</b>
(inside vs outside), <b>working</b> (natural vs cut), <b>distance</b> (within reach vs landscape) and
<b>what the subject is</b> (the space vs the banding on its face). If those axes hold on screen, a place
family is deeper than two slots and the tier closes. If the five are five brown walls, it is not — and
that is a finding against the human's chosen way out for the second time.</p>

<h2>4 — Every arm, both samples: does it agree with itself?</h2>
<p class=q>A verdict <b>holds</b> if both samples support it, and is <b>unsafe</b> if the two disagree —
the case a one-sample method cannot see. ${control ? `The <span style="color:#c96">${esc(control.family)}</span> row is the control: if it wobbles, so does the comparison.` : ""}</p>
${rows}
${retries}`;

  const out = join(OUT_DIR, "sheet.html");
  writeFileSync(out, html);
  console.log(`sheet ${out}`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const argv = process.argv.slice(2);

  if (argv.includes("--sheet")) return sheet();

  if (argv.includes("--retry")) {
    if (!RETRIES.length) {
      console.log("no repairs written yet — read pass 1 first");
      return;
    }
    for (const r of RETRIES)
      for (let n = 1; n <= r.draws; n++)
        await generate(r.fix, fileFor(r.slug, n), `${r.slug}--${n}`);
    return sheet();
  }

  for (const a of ARMS)
    for (let n = 1; n <= a.draws; n++)
      await generate(a.prompt, fileFor(a.slug, n), `${a.slug}--${n}`);
  sheet();
}

void main();
