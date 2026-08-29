/**
 * PROTOTYPE — #120. Throwaway. Do not import this from anything.
 *
 * The question: does widening past "metals" into rocks, gems and minerals buy
 * new SILHOUETTES, or only new colours?
 *
 * ── Why this is a bet worth testing before the theme's edge is drawn ────────
 * #115 measured three usable visual families on the Cloudflare lane — lump,
 * bar, crystal — and the human's way out was to widen the theme rather than
 * re-cut inside it. That call is a BET: it assumes the new territory brings
 * shapes, not just a bigger vocabulary. The bet is unproven and cheap to check,
 * and it is load-bearing — #121 draws the theme's edge on top of it and #118
 * authors thirty subjects on top of that.
 *
 * The bet is also not obviously safe. A rock is a lump. #115 already watched a
 * nugget, a meteorite and a chunk of ore land on ONE faceted-lump silhouette,
 * so "widen into rocks" could add ten subjects and no new cards.
 *
 * ── Three controls, not the one the ticket asked for ────────────────────────
 * The ticket asks for the bismuth crystal as a control, so "these all look
 * different" can be read against a known-distinct card. But the actual reading
 * this run has to support is narrower than that: not "is this a good card" but
 * "is this a card the theme ALREADY HAS". Every candidate is at risk of
 * collapsing into one SPECIFIC confirmed family, and a different one each time
 * — ore into lump, cluster into crystal, the cooled pour into bar. One control
 * cannot serve those three comparisons.
 *
 * So all three of #115's confirmed families are drawn, with its prompts
 * verbatim and the same pinned seed, which makes them true controls rather than
 * approximations: gold nugget (lump), silver bar (bar), bismuth (crystal).
 * Each candidate then has the shape it is accused of being sitting next to it.
 *
 * ── A within-family depth probe, because family COUNT is not the deliverable ─
 * The ticket ends on "and therefore whether a 15-card common tier is
 * reachable". That is arithmetic, and family count is only half of it: fifteen
 * cards cannot be six families, so some family has to carry three or four
 * alone. #115 found within-family distinctness the WORSE of the two numbers —
 * gold vs copper nugget was one card recoloured.
 *
 * Gems are the family a subject list would over-count fastest, because the
 * names are free: Ruby, Sapphire, Emerald, Amethyst, Topaz. So three cut gems
 * are drawn differing ONLY in colour, same cut, same wording. If they read as
 * one card in three colours, the gem family is worth about two slots and not
 * eight, and widening has bought a vocabulary rather than a tier. Deliberately
 * colour-only: varying the cut as well would flatter the family and confound
 * which lever moved it.
 *
 * The crystal family gets the same probe for free — the amethyst CLUSTER sits
 * against the single bismuth crystal, which asks whether "crystal" is one slot
 * or two.
 *
 * ── The arms ────────────────────────────────────────────────────────────────
 *   geode        a hollow rock split open — claims a silhouette metals has none of
 *   gem-*        the jeweller's shape, three colours (see depth probe above)
 *   cluster      many points on a matrix, against #115's single crystal
 *   slab         a sawn, polished banded face — flat, where everything else is not
 *   ore          #115's ore arm FAILED by drawing a landscape. Re-run with
 *                "a single chunk of" and NOTHING ELSE CHANGED, so the sheet can
 *                separate a wording failure from a family failure. A one-variable
 *                step; that is the whole point of keeping the rest verbatim.
 *   pour-*       the human kept the poured-metal family but ruled out the moment
 *                of pouring. Their reframe names two different pictures — "a
 *                solidified pour" and "a cooling bar still sitting in its sand
 *                mould" — so both are drawn. Each answers two questions at once:
 *                does it survive the runbook's burning rule now nothing glows,
 *                and is it still its own shape rather than the bar control?
 *   cave         a PLACE, not an object. #121 asks whether the theme takes
 *                places and calls them a silhouette source the object framing
 *                cannot reach; the pool has precedent (Cliffs of Moher,
 *                Machu Picchu, Olympus Mons). Drawn on the human's call, because
 *                if objects buy only colours this is the last lever left and
 *                #121 would otherwise be grilled without a picture of it.
 *
 * 13 images, one sample each. As #115 and #116: this is not measuring a RATE,
 * it asks whether pictures look like different cards, which one set answers and
 * twenty sets only answer more slowly.
 *
 * ── Cloudflare only ─────────────────────────────────────────────────────────
 * #115 retired `pollinations` FOR THIS THEME on measured evidence — `sana` drew
 * five of eight subjects as the same dome on grass and rendered an ingot as a
 * dome. #116 re-asked the lane question for foliage and it failed there too.
 * Spending Pollinations' 15s-apart serial cap on a lane already ruled out for
 * exactly this subject matter buys nothing, so this run is single-lane and
 * finishes in about two minutes.
 *
 * ── What is deliberately NOT varied ─────────────────────────────────────────
 * As #115 and #116: `ART_STYLE` is IMPORTED, not copied, and the Cloudflare
 * param bag reproduces `cloudflare-sdxl.ts` exactly. An answer drawn at
 * different settings would not be an answer about the art the runbook gets.
 *
 * Every prompt obeys the runbook's rules — one subject, a plain outdoor place,
 * no art-style words, no noun naming an object the picture could sit inside
 * (#81) — and carries #115's two wording findings: nothing is left with no
 * colour AND no texture (plain silver grew a face on both lanes), and anything
 * that sounds singular but is not gets "a single chunk of…". Note the cooled
 * pour arms are the second test of the face finding: they are silver, and
 * texture is the only thing keeping them from being #115's smiley egg.
 *
 * ── The repeat probe, added after the first read ────────────────────────────
 * Two of the three controls came back unlike what #115 recorded — the bismuth
 * crystal most of all, where #115 read "the most distinct card in the set" and
 * this run drew a tiled wall of blocks. The runbook already documents WHY
 * (`cloudflare-sdxl` returns different bytes despite the pinned seed, #66), so
 * the lane is not the finding. The METHOD is: #115 and #116 both drew one
 * sample per subject on the stated grounds that "twenty sets only answer more
 * slowly", and that reasoning silently assumes a subject has one look.
 *
 * So the same prompt is drawn three times, and the sheet shows the three side
 * by side. If they disagree, then a one-sample verdict on this lane cannot
 * separate "this SUBJECT draws badly" from "this DRAW was bad" — which puts an
 * error bar on every marginal call in #115 and #116, and on this run's own.
 * That is worth knowing before #118 authors thirty subjects against it.
 *
 * `seed/cards.json` is not touched and nothing is published.
 *
 *   pnpm prototype:120                draw everything; resumes, so an interrupt is cheap
 *   pnpm prototype:120 --repeat       draw the repeat probe (3x the same prompt)
 *   pnpm prototype:120 --sheet        rebuild the contact sheet from disk, draw nothing
 *
 * Output (gitignored scratch): seed/review/prototype-120/
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_SIZE } from "@/features/pool/providers";
import { ART_STYLE } from "@/features/pool/prompt";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-120");
const CF_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

/**
 * #115 returned a blank-but-valid 1.8 KB PNG once — a real 768x768 image, so
 * nothing in the seam caught it and only the human's eye did. Anything this
 * small is almost certainly that failure rather than a card, so the run says so
 * out loud instead of letting it slide into the sheet as evidence.
 */
const BLANK_BYTES = 20_000;

/**
 * The repeat probe. `repeat-1` IS `control-crystal` — the same prompt at the
 * same pinned seed — so only two extra draws are needed and the probe reads as
 * three samples of one subject.
 */
const REPEAT_OF = "control-crystal";
const REPEATS = ["repeat-2", "repeat-3"] as const;

type Subject = {
  slug: string;
  /** Shown on the sheet: what shape this is claiming to be. */
  family: string;
  /** `control` = a #115-confirmed family, verbatim. `arm` = the thing on trial. */
  kind: "control" | "arm";
  prompt: string;
  /** The confirmed family this is at risk of collapsing into, if any. */
  vs?: string;
};

const GRASS = "on green grass";

const SUBJECTS: readonly Subject[] = [
  // ── #115's three confirmed families, prompts verbatim, same seed ──────────
  {
    slug: "control-lump",
    family: "lump (control)",
    kind: "control",
    prompt: "a single lumpy gold nugget lying on green grass",
  },
  {
    slug: "control-bar",
    family: "bar (control)",
    kind: "control",
    prompt: "a single shiny silver metal bar with flat sides and rounded corners, lying on green grass",
  },
  {
    slug: "control-crystal",
    family: "crystal (control)",
    kind: "control",
    prompt: "a single rainbow-coloured bismuth crystal with square stepped edges, on green grass",
  },

  // ── The candidates ────────────────────────────────────────────────────────
  {
    slug: "geode",
    family: "split geode",
    kind: "arm",
    vs: "lump",
    prompt: `a single hollow round geode rock split open to show the purple crystal points lining its inside, ${GRASS}`,
  },
  {
    slug: "gem-ruby",
    family: "cut gem",
    kind: "arm",
    vs: "crystal",
    prompt: `a single deep red ruby gemstone cut with many flat sparkling facets and a pointed base, ${GRASS}`,
  },
  {
    slug: "gem-emerald",
    family: "cut gem (depth probe)",
    kind: "arm",
    vs: "cut gem",
    prompt: `a single deep green emerald gemstone cut with many flat sparkling facets and a pointed base, ${GRASS}`,
  },
  {
    slug: "gem-sapphire",
    family: "cut gem (depth probe)",
    kind: "arm",
    vs: "cut gem",
    prompt: `a single deep blue sapphire gemstone cut with many flat sparkling facets and a pointed base, ${GRASS}`,
  },
  {
    slug: "cluster",
    family: "crystal cluster",
    kind: "arm",
    vs: "crystal",
    prompt: `a single cluster of many tall pointed purple amethyst crystals growing out of a rough grey rock, ${GRASS}`,
  },
  {
    slug: "slab",
    family: "banded slab",
    kind: "arm",
    vs: "lump",
    prompt: `a single flat round slab of polished agate with wavy orange and white bands across its smooth cut face, ${GRASS}`,
  },
  {
    // #115's ore prompt with "a single chunk of" and nothing else changed.
    slug: "ore",
    family: "ore in rock (re-run)",
    kind: "arm",
    vs: "lump",
    prompt: "a single chunk of grey rock with bright green malachite crystals growing on it, on green grass",
  },
  {
    slug: "pour-puddle",
    family: "solidified pour",
    kind: "arm",
    vs: "lump",
    prompt: `a single lump of hardened silver metal with a rippled frozen surface and rounded edges, ${GRASS}`,
  },
  {
    slug: "pour-bar",
    family: "cooling bar in sand",
    kind: "arm",
    vs: "bar",
    prompt:
      "a single solid silver metal bar with a rough rippled top surface, half buried in a bed of dark grey sand",
  },
  {
    slug: "cave",
    family: "place",
    kind: "arm",
    prompt:
      "the inside of a rocky cave with tall pointed pale purple crystals growing out of its floor and walls",
  },
] as const;

function fileFor(slug: string): string {
  return join(OUT_DIR, `${slug}.png`);
}

/** `cloudflare-sdxl.ts`'s pinned param bag, reproduced. */
async function draw(s: Subject): Promise<void> {
  const file = fileFor(s.slug);
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
    console.log(`FAIL  ${s.slug} — HTTP ${res.status}`);
    return;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(file, bytes);
  const flag = bytes.byteLength < BLANK_BYTES ? "  <-- SUSPECT BLANK, re-roll (#115)" : "";
  console.log(`ok    ${s.slug.padEnd(16)} ${String(bytes.byteLength).padStart(8)}B${flag}`);
}

// ── The contact sheet ───────────────────────────────────────────────────────
//
// HTML with <img> tags, as #74, #81, #115, #116 and `contact-sheet.ts` do it.
// Composing a montage would need an image decoder, and `pnpm-workspace.yaml`
// pins `sharp` on the express grounds that this repo's own code never invokes
// it — a prototype importing it would retire that argument for nothing.

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const bySlug = new Map(SUBJECTS.map((s) => [s.slug, s]));

function img(slug: string, caption?: string): string {
  const s = bySlug.get(slug);
  if (!s) return "";
  const cap = caption ?? s.family;
  const cls = s.kind === "control" ? " class=ctrl" : "";
  return existsSync(fileFor(slug))
    ? `<figure${cls}><img src="${esc(slug)}.png" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`
    : `<figure class="miss">—<figcaption>${esc(cap)}</figcaption></figure>`;
}

function sheet(): void {
  // VIEW 1 — the binder strip. Everything adjacent, controls first, the way a
  // binder page is scanned. This is the headline count: how many genuinely
  // different cards are on the page, not how many are pretty.
  const strip = SUBJECTS.map((s) => img(s.slug)).join("");

  // VIEW 2 — head-to-head. Each candidate beside the confirmed family it is
  // accused of being. This is the view the three controls exist for: "new
  // silhouette" is not a judgement you can make in the abstract, only against
  // the shape the theme already has.
  const pairs = SUBJECTS.filter((s) => s.kind === "arm" && s.vs && s.vs !== "cut gem")
    .map((s) => {
      const ctrl = SUBJECTS.find((c) => c.kind === "control" && c.family.startsWith(s.vs ?? ""));
      const left = ctrl ? img(ctrl.slug, `${ctrl.family} — what it might already be`) : "";
      return `<div class=pair><div class=strip>${left}${img(s.slug, s.family)}</div>
        <div class=pr>${esc(s.prompt)}</div></div>`;
    })
    .join("");

  // VIEW 3 — depth. The arithmetic view. Three cut gems differing only in
  // colour, then the crystal family's single-vs-cluster pair. If a row reads as
  // one card recoloured, that family is worth about one slot however many names
  // it has, and a 15-card common tier needs correspondingly more families.
  const depth = `
    <h3>Cut gem — three colours, one cut, one wording</h3>
    <div class=strip>${img("gem-ruby", "ruby")}${img("gem-emerald", "emerald")}${img("gem-sapphire", "sapphire")}</div>
    <h3>Crystal — single vs cluster</h3>
    <div class=strip>${img("control-crystal", "single bismuth (control)")}${img("cluster", "amethyst cluster")}</div>`;

  // VIEW 4 — the place. No control, because the theme has no place to compare
  // it to; that is exactly the claim being tested.
  const place = `<div class=strip>${img("cave", "a place, not an object")}</div>`;

  // VIEW 5 — the repeat probe. One prompt, one pinned seed, three draws. This
  // view is about the METHOD, not the theme: it says how much weight a single
  // sample can carry on this lane, and therefore how firmly any verdict above
  // — or in #115 and #116 — can be stated.
  const repeatFig = (slug: string, cap: string): string =>
    existsSync(fileFor(slug))
      ? `<figure><img src="${esc(slug)}.png" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`
      : `<figure class="miss">—<figcaption>${esc(cap)}</figcaption></figure>`;
  const repeats = `<div class=strip>${repeatFig(REPEAT_OF, "draw 1")}${repeatFig("repeat-2", "draw 2")}${repeatFig("repeat-3", "draw 3")}</div>`;

  const html = `<!doctype html><meta charset=utf-8><title>#120 — does widening buy silhouettes or colours?</title>
<style>
body{font:14px/1.5 system-ui;margin:2rem;background:#111;color:#eee}
img{width:230px;height:230px;display:block}
.strip{display:flex;flex-wrap:wrap;gap:6px;margin:.25rem 0 1.25rem}
figure{margin:0;font-size:11px;color:#888;text-align:center}
figure.ctrl figcaption{color:#c96}
figure.miss{color:#555;width:230px;height:230px;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px dashed #333}
h1,h2,h3{font-weight:600}
h2{border-top:1px solid #333;padding-top:1rem;margin-top:2rem}
h3{margin-bottom:.25rem;font-size:13px;color:#9a9}
.q{color:#ccc;max-width:54rem}
.pair{margin-bottom:.5rem}
.pr{color:#9a9;font-style:italic;font-size:12px;max-width:60rem;margin:-.9rem 0 1.25rem}
code{color:#7a9}
</style>
<h1>#120 — does widening past &ldquo;metals&rdquo; buy silhouettes, or only colours?</h1>
<p class=q>13 images, Cloudflare only (#115 retired <code>pollinations</code> for this subject matter and
#116 for foliage). Captions in <span style="color:#c96">amber</span> are <b>controls</b> — #115's three
confirmed families, drawn from its own prompts at the same pinned seed, so they are the shapes the theme
already has rather than approximations of them.</p>

<h2>1 — The binder strip</h2>
<p class=q>The headline count. Scan it the way a binder page is scanned and count the silhouettes you can
actually tell apart. Widening is only worth doing if this strip holds more shapes than
<b>lump, bar, crystal</b>.</p>
<div class=strip>${strip}</div>

<h2>2 — Head-to-head: is it new, or is it the thing we have?</h2>
<p class=q>Each candidate beside the confirmed family it is at risk of collapsing into. #115 watched a
nugget, a meteorite and a chunk of ore land on one faceted-lump silhouette, so &ldquo;a rock&rdquo; is
guilty until it looks like something else. The <code>ore</code> row is a one-variable step from #115's
failed prompt — only <em>&ldquo;a single chunk of&rdquo;</em> was added — so it separates a wording
failure from a family failure. The two pour rows carry the human's reframe away from the moment of
pouring: judge both whether anything is burning and whether the shape is its own.</p>
${pairs}

<h2>3 — Depth: how many slots is a family actually worth?</h2>
<p class=q>Family count is half the arithmetic. Fifteen commons cannot be six families, so some family
carries three or four alone — and #115 found <em>within</em>-family the worse number, with gold and
copper nuggets reading as one card recoloured. Gems are the family a subject list would over-count
fastest, because the names are free.</p>
${depth}

<h2>4 — The place</h2>
<p class=q>Not an object. #121 asks whether the theme takes places and calls them a silhouette source the
object framing cannot reach; the pool already has Cliffs of Moher, Machu Picchu and Olympus Mons. If the
object arms above buy colours rather than shapes, this is the last lever left.</p>
${place}

<h2>5 — The repeat probe: how much does one sample prove?</h2>
<p class=q>The same prompt, the same pinned seed, three draws. The runbook already records that
<code>cloudflare-sdxl</code> returns different bytes despite the pinned seed (#66) — so the question here is
not about the lane but about the <b>method</b>. #115 and #116 each drew one sample per subject, reasoning
that &ldquo;twenty sets only answer more slowly&rdquo;. That holds only if a subject has one look. If these
three disagree, a one-sample verdict cannot separate <em>this subject draws badly</em> from <em>this draw
was bad</em> — and every marginal call above, and in #115 and #116, carries an error bar.</p>
${repeats}`;

  const out = join(OUT_DIR, "sheet.html");
  writeFileSync(out, html);
  console.log(`sheet ${out}`);
}

async function drawRepeats(): Promise<void> {
  const base = bySlug.get(REPEAT_OF);
  if (!base) return;
  for (const slug of REPEATS) await draw({ ...base, slug });
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const argv = process.argv.slice(2);
  if (argv.includes("--sheet")) return sheet();
  if (argv.includes("--repeat")) {
    await drawRepeats();
    return sheet();
  }
  for (const s of SUBJECTS) await draw(s);
  await drawRepeats();
  sheet();
}

void main();
