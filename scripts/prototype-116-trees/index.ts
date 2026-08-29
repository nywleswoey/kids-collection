/**
 * PROTOTYPE — #116. Throwaway. Do not import this from anything.
 *
 * The question: do everyday tree SPECIES draw as visually distinct cards, or do
 * Oak, Maple and Ash come back as three identical green lollipops?
 *
 * ── Why the sample is shaped the way it is ──────────────────────────────────
 * #115's shape was between-family and within-family. Trees has no families —
 * every subject is one tree — so the axis that matters here is a different one:
 * WHICH SPECIES, and UNDER WHICH FRAMING.
 *
 * Species are split deliberately into two classes, because they are not equally
 * at risk and the theme's arithmetic only cares about one of them:
 *
 *   EASY (2)  — Birch and Weeping Willow. Each carries a cue that survives at
 *               any distance: a white trunk, a drooping silhouette. If even
 *               these collapse, the angle is dead outright.
 *   HARD (3)  — Oak, Maple and Ash. Broad green crowns on a brown trunk, whose
 *               real differences live in leaf shape and bark texture. THIS is
 *               the measurement. A 15-card common tier needs roughly fifteen
 *               distinguishable species, and only a handful of species are
 *               Birch-shaped; the rest are this trio. If the hard three read as
 *               one card, the common tier cannot be filled however good the
 *               easy two look.
 *
 * Reading the easy pair alone would flatter the angle. Reading the hard trio
 * alone could not tell "the framing is wrong" from "the lane cannot draw trees".
 * Both classes are here so the two readings check each other.
 *
 * ── Three arms, because the ticket names two candidate culprits ─────────────
 * #116 asks whether identity survives, and if it only survives under a
 * different FRAMING, which framing. But framing is not the only lever the
 * runbook offers — it also says to *lead with the defining object*. A two-arm
 * run (whole tree vs close crop) would confound the two: a close crop names
 * leaf shape by necessity, so if it won, we would not know whether the win came
 * from the crop or from the words. Hence:
 *
 *   A  whole-plain   the runbook's default framing, species named and nothing
 *                    else. The baseline the angle is actually accused of.
 *   B  whole-cued    same framing, same distance, but naming the species' own
 *                    defining features. Isolates WORDING.
 *   C  detail        a close view of one branch — leaf and bark carry the
 *                    identity. Isolates FRAMING.
 *
 * A→B and A→C are each one-variable steps from the same baseline, so the sheet
 * can answer "wording, framing, both, or neither" rather than just "the crop
 * looked better". If B is enough, every `imagePrompt` the runbook writes gets
 * longer and the card still looks like the other 480. If only C works, Trees
 * becomes a theme of branch close-ups — a real cost, and one the human has to
 * accept before the subject list is drawn up, because it changes what a Trees
 * card IS.
 *
 * 5 species x 3 arms x 2 lanes = 30 images, one sample each. Like #115 this is
 * not measuring a RATE — it asks whether pictures look like different cards,
 * which one set answers and twenty sets only answer more slowly.
 *
 * ── Both lanes, despite #115 ───────────────────────────────────────────────
 * #115 ruled `pollinations` out FOR METALS: `sana` drew five of eight as the
 * same dome on grass. That was a verdict about grey lumps, not about the lane —
 * and `sana`'s painterly semi-realism is plausibly BETTER at foliage than at a
 * shiny ingot. Carrying #115's exclusion across to a green, textured subject
 * would be inheriting a finding past its evidence, so both lanes are drawn and
 * the lane question is re-asked here.
 *
 * ── What is deliberately NOT varied ─────────────────────────────────────────
 * As #115: `ART_STYLE` is IMPORTED, not copied, and both provider param bags
 * reproduce `cloudflare-sdxl.ts` and `pollinations.ts` exactly. An answer drawn
 * at different settings would not be an answer about the art the runbook gets.
 *
 * All fifteen prompts obey the runbook's rules: one subject, a plain outdoor
 * place, no art-style words, and no noun naming an object the picture could sit
 * inside (#81). Every tree gets "a single" in front of it — #115 found that a
 * subject which sounds singular but is not needs saying so explicitly.
 *
 * `seed/cards.json` is not touched and nothing is published.
 *
 *   pnpm prototype:116           draw everything; resumes, so an interrupt is cheap
 *   pnpm prototype:116 --sheet   rebuild the contact sheet from disk, draw nothing
 *
 * Output (gitignored scratch): seed/review/prototype-116/
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_SIZE } from "@/features/pool/providers";
import { ART_STYLE } from "@/features/pool/prompt";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-116");
const CF_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

const ARMS = ["whole-plain", "whole-cued", "detail"] as const;
type Arm = (typeof ARMS)[number];

const ARM_BLURB: Record<Arm, string> = {
  "whole-plain": "the runbook's default framing, species named and nothing else",
  "whole-cued": "same framing, defining features named — isolates wording",
  detail: "close view of one branch — isolates framing",
};

type Species = {
  slug: string;
  name: string;
  /** "easy" carries a cue visible at any distance; "hard" is the real test. */
  klass: "easy" | "hard";
  prompts: Record<Arm, string>;
};

const OUTDOORS = "on green grass under a blue sky";

const SPECIES: readonly Species[] = [
  {
    slug: "oak",
    name: "Oak",
    klass: "hard",
    prompts: {
      "whole-plain": `a single oak tree ${OUTDOORS}`,
      "whole-cued": `a single oak tree with a thick gnarled brown trunk and a wide rounded crown of small lobed green leaves, ${OUTDOORS}`,
      detail: "a close view of one oak branch with lobed green leaves and two brown acorns, blue sky behind",
    },
  },
  {
    slug: "maple",
    name: "Maple",
    klass: "hard",
    prompts: {
      "whole-plain": `a single maple tree ${OUTDOORS}`,
      "whole-cued": `a single maple tree with a straight grey trunk and a dense crown of broad five-pointed green leaves, ${OUTDOORS}`,
      detail:
        "a close view of one maple branch with broad five-pointed green leaves and a pair of winged seeds, blue sky behind",
    },
  },
  {
    slug: "ash",
    name: "Ash",
    klass: "hard",
    prompts: {
      "whole-plain": `a single ash tree ${OUTDOORS}`,
      "whole-cued": `a single ash tree with a tall pale grey trunk and an open airy crown of feathery leaves made of many small leaflets, ${OUTDOORS}`,
      detail:
        "a close view of one ash branch with a feathery leaf made of many small green leaflets, blue sky behind",
    },
  },
  {
    slug: "birch",
    name: "Birch",
    klass: "easy",
    prompts: {
      "whole-plain": `a single birch tree ${OUTDOORS}`,
      "whole-cued": `a single birch tree with a slender papery white trunk marked with black bands and small triangular green leaves, ${OUTDOORS}`,
      detail:
        "a close view of a papery white birch trunk with black bands and small triangular green leaves, blue sky behind",
    },
  },
  {
    slug: "willow",
    name: "Weeping Willow",
    klass: "easy",
    prompts: {
      "whole-plain": `a single weeping willow tree ${OUTDOORS}`,
      "whole-cued": `a single weeping willow tree with a short thick trunk and long thin branches of narrow green leaves hanging down to the ground, ${OUTDOORS}`,
      detail:
        "a close view of one weeping willow branch hanging down with long narrow green leaves, blue sky behind",
    },
  },
] as const;

const LANES = ["cloudflare", "pollinations"] as const;
type Lane = (typeof LANES)[number];

const EXT: Record<Lane, string> = { cloudflare: "png", pollinations: "jpeg" };

type Job = { slug: string; arm: Arm; prompt: string };

const JOBS: readonly Job[] = SPECIES.flatMap((s) =>
  ARMS.map((arm) => ({ slug: s.slug, arm, prompt: s.prompts[arm] })),
);

function fileFor(slug: string, arm: Arm, lane: Lane): string {
  return join(OUT_DIR, `${slug}--${arm}--${lane}.${EXT[lane]}`);
}

/** `cloudflare-sdxl.ts`'s pinned param bag, reproduced. */
async function drawCloudflare(job: Job): Promise<void> {
  const file = fileFor(job.slug, job.arm, "cloudflare");
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
        prompt: `${job.prompt}, ${ART_STYLE}`,
        width: CARD_SIZE.width,
        height: CARD_SIZE.height,
        num_steps: 20,
        guidance: 7.5,
        seed: 42,
      }),
    },
  );
  if (!res.ok) {
    console.log(`FAIL  cloudflare   ${job.slug}/${job.arm} — HTTP ${res.status}`);
    return;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(file, bytes);
  console.log(`ok    cloudflare   ${`${job.slug}/${job.arm}`.padEnd(22)} ${bytes.byteLength}B`);
}

/** `pollinations.ts`'s pinned query string, reproduced. Serial, 15s apart (#69). */
async function drawPollinations(job: Job): Promise<void> {
  const file = fileFor(job.slug, job.arm, "pollinations");
  if (existsSync(file)) return;

  const full = `${job.prompt}, ${ART_STYLE}`;
  const res = await fetch(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}` +
      `?width=${CARD_SIZE.width}&height=${CARD_SIZE.height}&model=flux&seed=42&nologo=true`,
  );
  if (!res.ok) {
    console.log(`FAIL  pollinations ${job.slug}/${job.arm} — HTTP ${res.status}`);
    return;
  }
  writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
  console.log(
    `ok    pollinations ${`${job.slug}/${job.arm}`.padEnd(22)} model=${res.headers.get("x-model-used") ?? "-"}`,
  );
  await new Promise((r) => setTimeout(r, 15_000));
}

// ── The contact sheet ───────────────────────────────────────────────────────
//
// HTML with <img> tags, as #74, #81, #115 and `contact-sheet.ts` do it.
// Composing a montage would need an image decoder, and `pnpm-workspace.yaml`
// pins `sharp` on the express grounds that this repo's own code never invokes
// it — a prototype importing it would retire that argument for nothing.

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function img(slug: string, arm: Arm, lane: Lane, caption: string): string {
  const f = `${slug}--${arm}--${lane}.${EXT[lane]}`;
  return existsSync(join(OUT_DIR, f))
    ? `<figure><img src="${esc(f)}" loading="lazy"><figcaption>${esc(caption)}</figcaption></figure>`
    : `<figure class=miss>—<figcaption>${esc(caption)}</figcaption></figure>`;
}

function sheet(): void {
  // BY ARM — the monotony test. One strip per (arm, lane): five species side by
  // side, the way a binder page shows them. Count the silhouettes you can tell
  // apart. The hard trio sits first in every strip, on purpose.
  const byArm = ARMS.map((arm) => {
    const lanes = LANES.map((lane) => {
      const strip = SPECIES.map((s) =>
        img(s.slug, arm, lane, `${s.name} · ${s.klass}`),
      ).join("");
      return `<h4>${esc(lane)}</h4><div class=strip>${strip}</div>`;
    }).join("");
    return `<h3>${esc(arm)}<span class=blurb> — ${esc(ARM_BLURB[arm])}</span></h3>${lanes}`;
  }).join("");

  // BY SPECIES — the lever test. One row per species: the three arms adjacent,
  // per lane. Answers "did naming the features fix it, or did the crop?" for
  // one tree at a time, which is the A→B / A→C comparison the arms were built
  // for and which the by-arm strips cannot show.
  const bySpecies = SPECIES.map((s) => {
    const lanes = LANES.map((lane) => {
      const cells = ARMS.map((arm) => img(s.slug, arm, lane, arm)).join("");
      return `<div class=laneRow><div class=laneName>${esc(lane)}</div><div class=strip>${cells}</div></div>`;
    }).join("");
    const prompts = ARMS.map(
      (arm) => `<li><b>${esc(arm)}</b> — ${esc(s.prompts[arm])}</li>`,
    ).join("");
    return `<h3>${esc(s.name)} <span class=blurb>(${s.klass})</span></h3>
      ${lanes}<ul class=pr>${prompts}</ul>`;
  }).join("");

  const html = `<!doctype html><meta charset=utf-8><title>#116 — do tree species draw as distinct cards?</title>
<style>
body{font:14px/1.5 system-ui;margin:2rem;background:#111;color:#eee}
img{width:230px;height:230px;display:block}
.strip{display:flex;flex-wrap:wrap;gap:6px;margin:.25rem 0 1.25rem}
figure{margin:0;font-size:11px;color:#888;text-align:center}
figure.miss{color:#555;width:230px;height:230px;display:flex;align-items:center;justify-content:center;flex-direction:column;border:1px dashed #333}
h1,h2,h3,h4{font-weight:600}
h3{margin-bottom:.25rem;border-top:1px solid #333;padding-top:1rem}
h4{margin:.5rem 0 0;color:#9a9;font-weight:400;font-size:12px}
.blurb{font-weight:400;color:#7a9;font-size:12px}
.laneRow{display:flex;align-items:flex-start;gap:.75rem}
.laneName{color:#9a9;font-size:12px;width:5.5rem;padding-top:.5rem}
.q{color:#ccc;max-width:52rem}
ul.pr{color:#9a9;font-style:italic;font-size:12px;max-width:60rem;margin:.25rem 0 1rem}
ul.pr b{font-style:normal;color:#7a9}
</style>
<h1>#116 — do everyday tree species draw as distinct cards?</h1>
<p class=q>Five species &times; three arms &times; two lanes, over two views of the same 30 images.
<b>Hard</b> = Oak, Maple, Ash: broad green crowns whose differences live in leaf and bark.
<b>Easy</b> = Birch, Weeping Willow: a white trunk and a drooping silhouette, cues that survive any
distance. A 15-card common tier needs roughly fifteen tellable-apart species, and most species are
in the hard class — so the hard trio is the measurement and the easy pair is the sanity check.</p>

<h2>By arm — the monotony test</h2>
<p class=q>Scan each strip the way a binder page is scanned. How many genuinely different cards are
here — not how many are pretty? If <code>whole-plain</code>'s hard three read as one tree recoloured,
the baseline framing cannot carry the theme; then read down to see whether
<code>whole-cued</code> (words) or <code>detail</code> (crop) rescues it.</p>
${byArm}

<h2>By species — which lever moved it</h2>
<p class=q>Same 30 images, re-adjacent. <code>whole-plain</code> → <code>whole-cued</code> and
<code>whole-plain</code> → <code>detail</code> are each a one-variable step from the same baseline,
so this view separates <em>wording</em> from <em>framing</em>. If only <code>detail</code> works,
a Trees card stops being a tree and becomes a branch — a cost to accept before the subject list is
drawn up, not after.</p>
${bySpecies}`;

  const out = join(OUT_DIR, "sheet.html");
  writeFileSync(out, html);
  console.log(`sheet ${out}`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  if (process.argv.slice(2).includes("--sheet")) return sheet();

  // The lanes are independent and pace themselves differently — Cloudflare is
  // ~6-8s per image, Pollinations is serial at 15s apart — so run them
  // alongside each other and wait on the slow one, as `--review` does.
  await Promise.all([
    (async () => {
      for (const j of JOBS) await drawCloudflare(j);
    })(),
    (async () => {
      for (const j of JOBS) await drawPollinations(j);
    })(),
  ]);
  sheet();
}

void main();
