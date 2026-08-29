/**
 * PROTOTYPE — #127. Throwaway. Do not import this from anything.
 *
 * The question: do #115's family verdicts hold when each arm is drawn THREE
 * times instead of once?
 *
 * ── Why this is a re-measurement and not a redesign ─────────────────────────
 * #120 re-drew #115's three confirmed families as controls and two of the three
 * came back unlike what #115 recorded — the bismuth most of all, which #115
 * called "the most distinct card in the set" and which drew as a tiled wall of
 * blocks. Drawing that one prompt three times at one pinned seed gave three
 * different compositions.
 *
 * The lane is not the finding: the runbook already records that
 * `cloudflare-sdxl` returns different bytes despite the pinned seed (#66). The
 * METHOD is. #115 and #116 each drew one sample per subject on the stated
 * grounds that "twenty sets only answer more slowly", which holds only if a
 * subject has one look. It does not, so one draw cannot separate "this SUBJECT
 * draws badly" from "this DRAW was bad" — and #118 is about to author thirty
 * subjects on top of #115's family count.
 *
 * So every prompt below is #115's, VERBATIM. Changing the words would answer a
 * different question. #124 has since confirmed the same method failure on the
 * Trees half, where #116's own `whole-cued` willow prompt — the one behind its
 * "every whole-cued image was a whole tree" — failed to draw a whole tree on
 * both re-samples.
 *
 * ── The sample accounting, which is why this run is 10 images and not 14 ────
 * "Two more each" would re-draw images that already exist. #115's arms have
 * been drawn a different number of times each, because #120 re-drew three of
 * them as its controls and repeated one of those three. Counting what is
 * already on disk:
 *
 *   nugget-gold      #115 x1 + #120 `control-lump`  x1  = 2  -> +1
 *   nugget-copper    #115 x1                            = 1  -> +2
 *   nugget-silver    #115 x1                            = 1  -> +2
 *   crystal-bismuth  #115 x1 + #120 x3 (repeat probe)   = 4  -> +0, already past three
 *   ingot-silver     #115 x1 + #120 `control-bar`   x1  = 2  -> +1
 *   molten-pour      #115 x1                            = 1  -> +2
 *   meteorite-iron   #115 x1                            = 1  -> +2
 *
 * The sheet reads those prior images off disk by relative path rather than
 * re-drawing them, so each row is a true three-sample row with its provenance
 * labelled. `ore-malachite` is dropped per the ticket: #120 settled it at three
 * samples and also found the repair.
 *
 * ── molten-pour is drawn even though the human already retired it ───────────
 * A case could be made for dropping it as a second exception. The human's call
 * in #115 was to keep the poured-metal family but reframe it away from the
 * moment of pouring, and #120 has already measured that reframe — `pour-puddle`
 * read as ice twice, `cooling bar in sand` works but is the bar silhouette
 * re-textured. On that reading the family's fate is settled and this prompt is
 * dead wording.
 *
 * It is drawn anyway, because the reasoning behind retiring it rests on the
 * same single image everything else here is being held to. #115's recorded
 * verdict is "reads as FIRE", and the runbook prohibits "nothing firing,
 * attacking, burning, sinking, exploding" (line 85). If two more samples do not
 * burn, then the burning rule may never have bitten this subject, and the
 * ORIGINAL pour framing is back in play — which matters, because #120 found the
 * reframed version adds no silhouette the theme does not already have, and the
 * theme is short of silhouettes by about three commons. Narrowing the ticket to
 * save two images would foreclose that.
 *
 * ── meteorite-iron is drawn even though the name is taken ──────────────────
 * `Meteorite` and `Asteroid` both belong to *Outer Space*, so this exact card
 * cannot ship however it draws. What is on trial is the FAMILY — "metal in
 * nature", which #115 recorded as collapsing into the faceted lump. A different
 * subject could carry that family if the family is real, so the verdict is
 * worth re-measuring even though the probe that produced it is name-blocked.
 *
 * ── Cloudflare only ────────────────────────────────────────────────────────
 * #115 retired `pollinations` for this theme on measured evidence and #116 for
 * foliage. Re-measuring a lane already ruled out would answer a question nobody
 * is asking.
 *
 * ── What is deliberately NOT varied ────────────────────────────────────────
 * As #115, #116, #120 and #124: `ART_STYLE` is IMPORTED, not copied, and the
 * Cloudflare param bag reproduces `cloudflare-sdxl.ts` exactly — including
 * `seed: 42`, which is the whole point. Same words, same seed, same settings,
 * different pictures.
 *
 * `seed/cards.json` is not touched and nothing is published.
 *
 *   pnpm prototype:127           draw the deficit; resumes, so an interrupt is cheap
 *   pnpm prototype:127 --sheet   rebuild the contact sheet from disk, draw nothing
 *
 * Output (gitignored scratch): seed/review/prototype-127/
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_SIZE } from "@/features/pool/providers";
import { ART_STYLE } from "@/features/pool/prompt";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-127");
const CF_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

/** #115 returned a blank-but-valid 1.8 KB PNG once, on the silver nugget. */
const BLANK_BYTES = 20_000;

/**
 * A sample already on disk from an earlier run. `src` is relative to this
 * run's output directory, so the sheet can show it without copying bytes.
 */
type Prior = { src: string; from: string };

type Arm = {
  slug: string;
  family: string;
  /** #115's recorded verdict — the thing on trial. */
  verdict115: string;
  /** #115's prompt, verbatim. Not to be edited. */
  prompt: string;
  /** Samples already drawn, oldest first. */
  prior: readonly Prior[];
  /** How many more this run draws to reach three. */
  draws: number;
};

const ARMS: readonly Arm[] = [
  {
    slug: "nugget-gold",
    family: "raw nugget",
    verdict115: "works — faceted lump",
    prompt: "a single lumpy gold nugget lying on green grass",
    prior: [
      { src: "../prototype-115/nugget-gold--cloudflare.png", from: "#115" },
      { src: "../prototype-120/control-lump.png", from: "#120 control" },
    ],
    draws: 1,
  },
  {
    slug: "nugget-copper",
    family: "raw nugget (within-family)",
    verdict115: "one card recoloured — same lump, same facets, same pose as gold",
    prompt: "a single lumpy reddish-brown copper nugget lying on green grass",
    prior: [
      { src: "../prototype-115/nugget-copper--cloudflare.png", from: "#115" },
    ],
    draws: 2,
  },
  {
    slug: "nugget-silver",
    family: "raw nugget (within-family)",
    verdict115: "grew a FACE; Cloudflare's first attempt returned a blank 1.8 KB PNG",
    prompt: "a single lumpy pale silver nugget lying on green grass",
    prior: [
      { src: "../prototype-115/nugget-silver--cloudflare.png", from: "#115" },
    ],
    draws: 2,
  },
  {
    slug: "crystal-bismuth",
    family: "grown crystal",
    verdict115: "works — THE MOST DISTINCT CARD IN THE SET",
    prompt:
      "a single rainbow-coloured bismuth crystal with square stepped edges, on green grass",
    prior: [
      { src: "../prototype-115/crystal-bismuth--cloudflare.png", from: "#115" },
      { src: "../prototype-120/control-crystal.png", from: "#120 control" },
      { src: "../prototype-120/repeat-2.png", from: "#120 repeat" },
      { src: "../prototype-120/repeat-3.png", from: "#120 repeat" },
    ],
    draws: 0,
  },
  {
    slug: "ingot-silver",
    family: "cast ingot",
    verdict115: "works — genuinely its own shape",
    prompt:
      "a single shiny silver metal bar with flat sides and rounded corners, lying on green grass",
    prior: [
      { src: "../prototype-115/ingot-silver--cloudflare.png", from: "#115" },
      { src: "../prototype-120/control-bar.png", from: "#120 control" },
    ],
    draws: 1,
  },
  {
    slug: "molten-pour",
    family: "poured metal",
    verdict115: "reads as FIRE — which is what retired the moment of pouring",
    prompt:
      "a stream of glowing orange molten metal pouring from a tilted clay crucible into a sand mould, outdoors in daylight",
    prior: [
      { src: "../prototype-115/molten-pour--cloudflare.png", from: "#115" },
    ],
    draws: 2,
  },
  {
    slug: "meteorite-iron",
    family: "metal in nature",
    verdict115: "collapses — same faceted-lump silhouette as the nugget, darker",
    prompt:
      "a single dark pitted iron meteorite with a shiny metallic surface, on green grass",
    prior: [
      { src: "../prototype-115/meteorite-iron--cloudflare.png", from: "#115" },
    ],
    draws: 2,
  },
] as const;

function fileFor(slug: string, n: number): string {
  return join(OUT_DIR, `${slug}--${n}.png`);
}

/** `cloudflare-sdxl.ts`'s pinned param bag, reproduced. */
async function draw(a: Arm, n: number): Promise<void> {
  const file = fileFor(a.slug, n);
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
        prompt: `${a.prompt}, ${ART_STYLE}`,
        width: CARD_SIZE.width,
        height: CARD_SIZE.height,
        num_steps: 20,
        guidance: 7.5,
        seed: 42,
      }),
    },
  );
  if (!res.ok) {
    console.log(`FAIL  ${a.slug}--${n} — HTTP ${res.status}`);
    return;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(file, bytes);
  const flag =
    bytes.byteLength < BLANK_BYTES ? "  <-- SUSPECT BLANK, re-roll (#115)" : "";
  console.log(
    `ok    ${`${a.slug}--${n}`.padEnd(20)} ${String(bytes.byteLength).padStart(8)}B${flag}`,
  );
}

// ── The contact sheet ───────────────────────────────────────────────────────

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function fig(src: string, cap: string, cls = ""): string {
  const disk = src.startsWith("../") ? join(OUT_DIR, src) : join(OUT_DIR, src);
  return existsSync(disk)
    ? `<figure class="${cls}"><img src="${esc(src)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`
    : `<figure class="miss">—<figcaption>${esc(cap)}</figcaption></figure>`;
}

/** Every sample of one arm, oldest first, provenance labelled. */
function row(a: Arm): string {
  const olds = a.prior.map((p, i) => fig(p.src, `sample ${i + 1} — ${p.from}`, "old"));
  const news = Array.from({ length: a.draws }, (_, i) =>
    fig(`${a.slug}--${i + 1}.png`, `sample ${a.prior.length + i + 1} — #127`, "new"),
  );
  const total = a.prior.length + a.draws;
  return `<h3>${esc(a.family)} <span class=n>· ${total} samples</span></h3>
    <div class=v>#115 recorded: <b>${esc(a.verdict115)}</b></div>
    <div class=strip>${olds.join("")}${news.join("")}</div>
    <div class=pr>${esc(a.prompt)}</div>`;
}

function sheet(): void {
  const rows = ARMS.map(row).join("");

  // The between-family view: sample 1 of every arm, which is the ONLY view
  // #115 ever had. Then the same comparison rebuilt from this run's newest
  // sample of each. If the two strips support different family counts, the
  // count #118 authors against was an artefact of which draws happened to land.
  const asRead = ARMS.map((a) =>
    fig(a.prior[0]?.src ?? "", a.family, "old"),
  ).join("");
  const asNow = ARMS.map((a) => {
    const src =
      a.draws > 0
        ? `${a.slug}--${a.draws}.png`
        : (a.prior[a.prior.length - 1]?.src ?? "");
    return fig(src, a.family, a.draws > 0 ? "new" : "old");
  }).join("");

  const html = `<!doctype html><meta charset=utf-8><title>#127 — do #115's verdicts hold at three samples?</title>
<style>
body{font:14px/1.5 system-ui;margin:2rem;background:#111;color:#eee}
img{width:215px;height:215px;display:block}
.strip{display:flex;flex-wrap:wrap;gap:6px;margin:.25rem 0 1rem}
figure{margin:0;font-size:11px;color:#888;text-align:center}
figure.old figcaption{color:#777}
figure.new figcaption{color:#6b9}
figure.miss{color:#555;width:215px;height:215px;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px dashed #333}
h1,h2,h3{font-weight:600}
h2{border-top:1px solid #333;padding-top:1rem;margin-top:2rem}
h3{margin-bottom:.15rem;font-size:13px;color:#9a9}
.n{color:#666;font-weight:400}
.q{color:#ccc;max-width:56rem}
.v{color:#c96;font-size:12px;margin-bottom:.35rem}
.pr{color:#788;font-style:italic;font-size:12px;max-width:60rem;margin:-.7rem 0 1.5rem}
code{color:#7a9}
</style>
<h1>#127 — do #115's family verdicts hold at three samples?</h1>
<p class=q>Every prompt is <b>#115's, verbatim</b> — this is a re-measurement, not a redesign, so changing
the words would answer a different question. Grey captions are samples that already existed (#115, and the
three arms #120 re-drew as controls); <span style="color:#6b9">green</span> captions are drawn by this run.
10 new images: the deficit needed to bring each arm to three, not two more of everything, because the
bismuth is already at four and re-drawing what exists measures nothing.
<code>ore-malachite</code> is dropped — #120 settled it at three samples and found its repair.</p>

<h2>1 — The strip #115 actually saw, against the strip drawn now</h2>
<p class=q>The top strip is <b>sample 1 of every arm</b>: the one view #115 ever had, and the evidence
behind <em>lump, bar, crystal</em>. The bottom strip is the newest sample of each. Count the families in
each strip independently. <b>If the two counts differ, the number #118 is about to author thirty subjects
against was an artefact of which draws happened to land</b> — which is the whole question.</p>
<h3>As #115 saw it — sample 1 of each</h3><div class=strip>${asRead}</div>
<h3>As it draws now — newest sample of each</h3><div class=strip>${asNow}</div>

<h2>2 — Every arm, every sample, against its recorded verdict</h2>
<p class=q>Each row carries #115's verdict in <span style="color:#c96">amber</span>. Read the samples
against the words: a verdict <b>survives</b> if the row is consistent with it, <b>changes</b> if the row is
consistently something else, and is <b>unsafe</b> if the row disagrees with itself — that last case is the
one a one-sample method cannot see, and the one that costs #118 the most.</p>
${rows}`;

  const out = join(OUT_DIR, "sheet.html");
  writeFileSync(out, html);
  console.log(`sheet ${out}`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  if (process.argv.slice(2).includes("--sheet")) return sheet();
  for (const a of ARMS)
    for (let n = 1; n <= a.draws; n++) await draw(a, n);
  sheet();
}

void main();
