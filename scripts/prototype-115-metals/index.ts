/**
 * PROTOTYPE — #115. Throwaway. Do not import this from anything.
 *
 * The question: does *Metals as found and formed* draw as visually DISTINCT
 * cards, or do fifteen commons all come back as "a lump on green grass"?
 *
 * ── Why the sample is shaped the way it is ──────────────────────────────────
 * #115 names six candidate sub-territories and asks which read as different
 * card art. That measures BETWEEN-family distinctness — six subjects, six
 * families. But the tier that is actually at risk is the common fifteen, and
 * fifteen cards cannot be six families: some family has to carry three or four
 * on its own. So this run adds a WITHIN-family probe on the family most likely
 * to collapse — three raw nuggets (gold, copper, silver), whose only declared
 * difference is colour. Between-family distinctness says how many families
 * exist; within-family distinctness says how deep each one can be filled. The
 * ticket's arithmetic needs both.
 *
 * Eight subjects, both lanes, one sample each. This is not measuring a RATE the
 * way #81 was — it asks whether two pictures look like different cards, which a
 * single pair answers and twenty pairs only answer more slowly. Pollinations is
 * capped at one queued request per IP, 15s apart (#69), so samples here are
 * wall-clock, not free.
 *
 * ── What is deliberately NOT varied ─────────────────────────────────────────
 * The style string is IMPORTED, not copied. #81's prototype pinned a verbatim
 * copy because it was testing the constant itself and needed a control that
 * survived the fix; this one is testing subjects through the shipped pipeline,
 * so it must move when `ART_STYLE` moves. Provider params reproduce the two
 * adapters' pinned bags exactly (`cloudflare-sdxl.ts`, `pollinations.ts`), for
 * the same reason: an answer drawn at different settings would not be an answer
 * about the art the runbook will actually get.
 *
 * `seed/cards.json` is not touched and nothing is published.
 *
 * ── Reading the sheet ───────────────────────────────────────────────────────
 * Two views over the same images, because the two questions want different
 * adjacencies:
 *
 *   BY FAMILY  — one row per subject, lanes side by side. Answers "does this
 *                sub-territory have its own look, and which lane draws it".
 *   BY LANE    — every subject in one strip per lane, the way a binder page
 *                shows them. Answers the monotony question directly: scan the
 *                strip and count how many silhouettes you actually see.
 *
 * The within-family nuggets sit adjacent in both views on purpose. If gold,
 * copper and silver read as one card in three colours, the nugget family is
 * worth ONE common slot, not four, and the theme is short of subjects.
 *
 * ── The molten arm carries a content risk, not just an art risk ─────────────
 * "Poured or molten metal" is one of the six the ticket names, but the runbook
 * forbids anything burning, and a crucible pour is the closest a metal subject
 * gets to that line. It is drawn here so the human can judge both at once: if
 * the picture is beautiful and reads as fire, the family is out on content
 * grounds regardless of how distinct it looks, and the count of usable families
 * drops by one before any art verdict is reached.
 *
 *   pnpm prototype:115           draw everything; resumes, so an interrupt is cheap
 *   pnpm prototype:115 --sheet   rebuild the contact sheet from disk, draw nothing
 *
 * Output (gitignored scratch): seed/review/prototype-115/
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_SIZE } from "@/features/pool/providers";
import { ART_STYLE } from "@/features/pool/prompt";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-115");
const CF_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

/**
 * Six candidate sub-territories, plus two extra nuggets.
 *
 * The prompts are written to the runbook's rules rather than to make the point:
 * one subject, a viewpoint, a plain outdoor place, no art-style words and no
 * noun naming an object the picture could sit inside. Everything metallic is
 * put on green grass so a grey subject has a ground to be distinct from —
 * the monochrome trap the runbook warns about would otherwise be doing the
 * collapsing here instead of the subject matter.
 */
const SUBJECTS = [
  {
    slug: "nugget-gold",
    family: "raw nugget",
    prompt: "a single lumpy gold nugget lying on green grass",
  },
  {
    slug: "nugget-copper",
    family: "raw nugget",
    prompt: "a single lumpy reddish-brown copper nugget lying on green grass",
  },
  {
    slug: "nugget-silver",
    family: "raw nugget",
    prompt: "a single lumpy pale silver nugget lying on green grass",
  },
  {
    slug: "ore-malachite",
    family: "ore in rock",
    prompt: "a chunk of grey rock with bright green malachite crystals growing on it, on green grass",
  },
  {
    slug: "crystal-bismuth",
    family: "grown crystal",
    prompt: "a single rainbow-coloured bismuth crystal with square stepped edges, on green grass",
  },
  {
    slug: "ingot-silver",
    family: "cast ingot",
    prompt: "a single shiny silver metal bar with flat sides and rounded corners, lying on green grass",
  },
  {
    slug: "molten-pour",
    family: "poured metal",
    prompt:
      "a stream of glowing orange molten metal pouring from a tilted clay crucible into a sand mould, outdoors in daylight",
  },
  {
    slug: "meteorite-iron",
    family: "metal in nature",
    prompt: "a single dark pitted iron meteorite with a shiny metallic surface, on green grass",
  },
] as const;

const LANES = ["cloudflare", "pollinations"] as const;
type Lane = (typeof LANES)[number];

const EXT: Record<Lane, string> = { cloudflare: "png", pollinations: "jpeg" };

function fileFor(slug: string, lane: Lane): string {
  return join(OUT_DIR, `${slug}--${lane}.${EXT[lane]}`);
}

/** `cloudflare-sdxl.ts`'s pinned param bag, reproduced. */
async function drawCloudflare(slug: string, prompt: string): Promise<void> {
  const file = fileFor(slug, "cloudflare");
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
    console.log(`FAIL  cloudflare   ${slug} — HTTP ${res.status}`);
    return;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(file, bytes);
  console.log(`ok    cloudflare   ${slug.padEnd(16)} ${bytes.byteLength}B`);
}

/** `pollinations.ts`'s pinned query string, reproduced. Serial, 15s apart (#69). */
async function drawPollinations(slug: string, prompt: string): Promise<void> {
  const file = fileFor(slug, "pollinations");
  if (existsSync(file)) return;

  const full = `${prompt}, ${ART_STYLE}`;
  const res = await fetch(
    `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}` +
      `?width=${CARD_SIZE.width}&height=${CARD_SIZE.height}&model=flux&seed=42&nologo=true`,
  );
  if (!res.ok) {
    console.log(`FAIL  pollinations ${slug} — HTTP ${res.status}`);
    return;
  }
  writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
  console.log(
    `ok    pollinations ${slug.padEnd(16)} model=${res.headers.get("x-model-used") ?? "-"}`,
  );
  await new Promise((r) => setTimeout(r, 15_000));
}

// ── The contact sheet ───────────────────────────────────────────────────────
//
// HTML with <img> tags, the way #74's and #81's prototypes and
// `contact-sheet.ts` do it. Composing a montage would need an image decoder,
// and `pnpm-workspace.yaml` pins `sharp` on the express grounds that this
// repo's own code never invokes it — a prototype importing it would retire that
// argument for nothing.

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function cell(slug: string, lane: Lane): string {
  const f = `${slug}--${lane}.${EXT[lane]}`;
  return existsSync(join(OUT_DIR, f))
    ? `<td><img src="${esc(f)}" loading="lazy"><div>${lane}</div></td>`
    : `<td class=miss>—</td>`;
}

function sheet(): void {
  const byFamily = SUBJECTS.map((s) => {
    const cells = LANES.map((lane) => cell(s.slug, lane)).join("");
    return `<tr><th>${esc(s.slug)}<div class=fam>${esc(s.family)}</div></th>${cells}
      <td class=pr>${esc(s.prompt)}</td></tr>`;
  }).join("");

  const byLane = LANES.map((lane) => {
    const strip = SUBJECTS.map((s) => {
      const f = `${s.slug}--${lane}.${EXT[lane]}`;
      return existsSync(join(OUT_DIR, f))
        ? `<figure><img src="${esc(f)}" loading="lazy"><figcaption>${esc(s.slug)}</figcaption></figure>`
        : `<figure class=miss>—<figcaption>${esc(s.slug)}</figcaption></figure>`;
    }).join("");
    return `<h3>${esc(lane)}</h3><div class=strip>${strip}</div>`;
  }).join("");

  const html = `<!doctype html><meta charset=utf-8><title>#115 — Metals sub-territories</title>
<style>
body{font:14px/1.5 system-ui;margin:2rem;background:#111;color:#eee}
img{width:230px;height:230px;display:block}
table{border-collapse:collapse;margin:.5rem 0 2rem}
th{text-align:right;padding-right:.75rem;font-weight:600;white-space:nowrap;vertical-align:top}
td{padding:2px;text-align:center;font-size:11px;color:#888;vertical-align:top}
td.miss,figure.miss{color:#555}
td.pr{text-align:left;color:#9a9;font-style:italic;max-width:22rem;padding-left:1rem}
.fam{font-weight:400;color:#7a9;font-size:11px}
.strip{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:2rem}
figure{margin:0;font-size:11px;color:#888;text-align:center}
h1,h2,h3{font-weight:600}
.q{color:#ccc;max-width:52rem}
</style>
<h1>#115 — do the Metals sub-territories draw as distinct cards?</h1>
<p class=q>Two questions, two views of the same 16 images.</p>
<h2>By lane — the monotony test</h2>
<p class=q>Scan each strip the way a binder page is scanned. How many genuinely
different <em>silhouettes</em> are here — not colours, silhouettes? That number is
how many visual families a 15-card common tier can draw on. The three nuggets are
the within-family probe: if <code>nugget-gold</code>, <code>nugget-copper</code> and
<code>nugget-silver</code> read as one card recoloured, the nugget family is worth one
slot rather than four.</p>
${byLane}
<h2>By family — which lane draws which sub-territory</h2>
<p class=q>Same images, paired per subject. A family that only works on one lane is
still a family; a family that works on neither is out.</p>
<table>${byFamily}</table>`;

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
      for (const s of SUBJECTS) await drawCloudflare(s.slug, s.prompt);
    })(),
    (async () => {
      for (const s of SUBJECTS) await drawPollinations(s.slug, s.prompt);
    })(),
  ]);
  sheet();
}

void main();
