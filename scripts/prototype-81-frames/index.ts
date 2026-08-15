/**
 * PROTOTYPE — #81. Throwaway. Do not import this from anything.
 *
 * The question: `cloudflare-sdxl` bakes a decorative frame border into most
 * cards — a wooden picture frame, a tan mat with a gold rule, a rounded panel,
 * with the card's subject inset inside it. #81 listed three leads and asked
 * which, if any, suppresses it: the pinned seed, a negative prompt, and whether
 * Pollinations does the same.
 *
 * It answers all three and finds the cause somewhere none of them pointed:
 * `ART_STYLE` said "trading-CARD illustration", and SDXL drew the card.
 *
 * ── Why this is measured rather than eyeballed ───────────────────────────────
 * A frame is invisible to every automated check the seam has — the bytes are a
 * valid 768x768 PNG, so `finishGeneration` passes them, and it only shows up to
 * a human at checkpoint 2. That makes eyeballing the only available instrument,
 * and eyeballing a contact sheet is exactly where a small sample misleads: the
 * first pass here read a 6-of-8 rate from #74's images, and #74 in turn had read
 * "Warhorse 3/3 framed" from three. Both are true and neither generalises, since
 * this lane is non-deterministic despite `seed: 42` being pinned (#66, #74) — the
 * same request frames on one run and not the next.
 *
 * So: 20 samples per arm, 4 subjects x 5 seeds, PAIRED on seed so each treated
 * sample has a same-seed control. And `--score` re-judges the same images
 * mechanically (a uniform band along all four edges), because a second
 * instrument that agrees is worth more than a bigger sample from the first one.
 * It under-counts ornate frames, whose borders are too textured to read as a
 * flat band — but it under-counts every arm equally, so the ranking holds.
 *
 * ── What it found ───────────────────────────────────────────────────────────
 * Framed, by eye and by the detector on the same images. `src/features/pool/
 * prompt.ts` holds the canonical table and the reasoning; this is the run that
 * produced it:
 *
 *                                          by eye    detector
 *                                          (1 run)   (2 runs)
 *   ART_STYLE as-is                        11 / 20    13 / 40
 *   + negative_prompt on the adapter        8 / 20     7 / 40
 *   + "full-bleed edge-to-edge, no border" 10 / 20    10 / 40
 *   without "trading-card"                  1 / 20     2 / 40
 *   #74's cloudflare images, as filed            -     5 / 12
 *   #74's pollinations images (control)     0 / 12     0 / 12
 *
 * Run it twice before believing any of it. The first run of 20 read
 * `negative_prompt` as inert; the replication showed it roughly halving the
 * rate — still not the fix, but not nothing, and a conclusion that flipped on a
 * second sample of the same size.
 *
 * The `notext` arm answers a question the fix invites rather than one #81 asked:
 * "no text" is the same shape as "no border", so is it a cue too? Text appeared
 * once in 20 with the phrase and never in 20 without — no detectable effect at
 * this sample size, so it stays. The asymmetry is about the noun: a trading card
 * is depictable and "text" is not.
 *
 * The two failures earn their place: both are the obvious next idea. Naming the
 * border in order to forbid it is a border CUE, because the model weights the
 * noun and drops the negation. And `negative_prompt` buys nothing while every
 * entry in `params` is hashed into review filenames, so adding one would
 * invalidate a folder of reviewed images for free.
 *
 * The Pollinations arm is what made the fix affordable rather than merely
 * correct: `sana` draws all four subjects the same either way — same painterly
 * semi-realism, same compositions, same failure modes — and never drew a frame.
 * It never read the phrase. Since every one of the ~360 published cards came
 * from that lane, editing a globally-shared prompt constant costs the binder's
 * coherence nothing.
 *
 * ── Why the detector is not in here ─────────────────────────────────────────
 * It needed a decoder to reach pixels, and the only one in the tree is `sharp`.
 * `pnpm-workspace.yaml` pins that on the express grounds that "sharp is invoked
 * by `next` alone and never by this repo's own code", which is what makes a 0.x
 * MINOR override safe there — `next build` exercises its whole surface. A
 * prototype importing it would quietly retire that argument, for a
 * cross-check that under-reads every arm anyway. So the committed harness emits
 * the same thing #74's did: a contact sheet a human reads. The by-eye column is
 * the canonical one regardless, and it is the more severe of the two.
 *
 *   pnpm prototype:81            run every arm; resumes, so an interrupt is cheap
 *   pnpm prototype:81 --sheet    rebuild the contact sheet from disk, generate nothing
 *
 * Output (gitignored scratch): seed/review/prototype-81/
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CARD_SIZE } from "@/features/pool/providers";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-81");
const CF_MODEL = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

/**
 * The style strings under test.
 *
 * `current` is what `ART_STYLE` said when #81 was filed, kept verbatim rather
 * than imported: this script has to be able to reproduce the FRAMED arm after
 * the constant is fixed, and an import would silently retire the control.
 */
const STYLES = {
  current:
    "vibrant kid-friendly cartoon trading-card illustration, bright colors, " +
    "friendly, clean background, no text",
  nocard:
    "vibrant kid-friendly cartoon illustration, bright colors, " +
    "friendly, clean background, no text",
  fullbleed:
    "vibrant kid-friendly cartoon trading-card illustration, bright colors, " +
    "friendly, clean background, no text, full-bleed edge-to-edge artwork, no border",
  /** The fix, with "no text" also removed — see the notext arm in the header. */
  notext: "vibrant kid-friendly cartoon illustration, bright colors, friendly, clean background",
} as const;

/** Tried as `negative_prompt`, and measured to do nothing. Kept so that is checkable. */
const NEGATIVE =
  "frame, border, picture frame, framed, matte, mat board, vignette, " +
  "ornate border, rounded corners, inset panel, text, watermark, signature";

/**
 * #74's three hard subjects plus its control, with the prompts that actually
 * shipped in `seed/cards.json`. Warhorse is the load-bearing one: it dodges all
 * three of the runbook's failure classes, so a frame on it cannot be blamed on a
 * difficult subject. It framed 5/5 in the baseline arm.
 */
const SUBJECTS = [
  {
    slug: "warhorse",
    prompt: "a friendly brown horse wearing a red and gold cloth blanket standing on green grass",
  },
  {
    slug: "longbowman",
    prompt:
      "a tall wooden longbow held upright by a cheerful medieval archer in a green tunic on green grass",
  },
  {
    slug: "swiss-guard",
    prompt:
      "a cheerful young guard in a puffy blue and yellow striped renaissance costume with a white ruff collar and a black beret on grey cobblestones",
  },
  {
    slug: "charioteer",
    prompt:
      "two brown horses pulling a small golden two-wheeled chariot with a smiling egyptian driver holding the reins, on sand",
  },
] as const;

/**
 * Five seeds, not one. The adapter pins 42, and the point of varying it is to
 * retire #81's own first lead: if the frame tracked the seed there would be a
 * lucky one to pick. It does not — frames appear and vanish at every seed,
 * including repeats of 42.
 */
const SEEDS = [42, 7, 123, 2024, 999] as const;

interface Arm {
  key: string;
  style: keyof typeof STYLES;
  negative: boolean;
}

const ARMS: readonly Arm[] = [
  { key: "base", style: "current", negative: false },
  { key: "neg", style: "current", negative: true },
  { key: "nocard", style: "nocard", negative: false },
  { key: "fullbleed", style: "fullbleed", negative: false },
  { key: "notext", style: "notext", negative: false },
];

function fileFor(subject: string, seed: number, arm: string): string {
  return join(OUT_DIR, `${subject}--seed${seed}--${arm}.png`);
}

async function generate(subject: string, prompt: string, seed: number, arm: Arm): Promise<void> {
  const file = fileFor(subject, seed, arm.key);
  if (existsSync(file)) return;

  const body: Record<string, unknown> = {
    prompt: `${prompt}, ${STYLES[arm.style]}`,
    width: CARD_SIZE.width,
    height: CARD_SIZE.height,
    // The adapter's pinned bag, reproduced. Only what this run varies varies.
    num_steps: 20,
    guidance: 7.5,
    seed,
  };
  if (arm.negative) body.negative_prompt = NEGATIVE;

  const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${CF_MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN ?? ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    console.log(`FAIL  ${subject} seed${seed} ${arm.key} — HTTP ${res.status}`);
    return;
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  writeFileSync(file, bytes);
  console.log(`ok    ${subject} seed${seed} ${arm.key.padEnd(9)} ${bytes.byteLength}B`);
}

/**
 * The Pollinations control — the arm that decides whether the fix is affordable.
 *
 * One sample per subject per style, not five: this lane is anonymous and capped
 * at one queued request per IP with 15s between starts (#69), so twenty samples
 * would cost ten minutes to answer a question one sample answers. It is not
 * measuring a RATE — `sana` never drew a frame at all, in #74's twelve or here —
 * it is asking whether the house style moves. It does not.
 */
async function pollinationsControl(): Promise<void> {
  const dir = join(OUT_DIR, "poll");
  mkdirSync(dir, { recursive: true });
  for (const s of SUBJECTS) {
    for (const style of ["current", "nocard"] as const) {
      const file = join(dir, `${s.slug}--${style}.jpeg`);
      if (existsSync(file)) continue;
      const full = `${s.prompt}, ${STYLES[style]}`;
      const res = await fetch(
        `https://image.pollinations.ai/prompt/${encodeURIComponent(full)}` +
          `?width=${CARD_SIZE.width}&height=${CARD_SIZE.height}&model=flux&seed=42&nologo=true`,
      );
      if (!res.ok) {
        console.log(`FAIL  pollinations ${s.slug} ${style} — HTTP ${res.status}`);
        continue;
      }
      writeFileSync(file, new Uint8Array(await res.arrayBuffer()));
      console.log(
        `ok    pollinations ${s.slug} ${style.padEnd(7)} model=${res.headers.get("x-model-used") ?? "-"}`,
      );
      await new Promise((r) => setTimeout(r, 15_000)); // #69's serial cap
    }
  }
}

// ── The contact sheet ───────────────────────────────────────────────────────
//
// HTML with <img> tags, the way #74's prototype and `contact-sheet.ts` do it —
// composing a montage would need a decoder this repo deliberately keeps out of
// its own code (see the header). Rows are the arms in order, columns the seeds,
// so a frame that tracks an arm shows up as a horizontal band and one that
// tracks a seed as a vertical one. The baseline reads as neither, which is how
// the run rules the seed out.

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function sheet(): void {
  const rows = SUBJECTS.map((s) => {
    const arms = ARMS.map((arm) => {
      const cells = SEEDS.map((seed) => {
        const f = `${s.slug}--seed${seed}--${arm.key}.png`;
        return existsSync(join(OUT_DIR, f))
          ? `<td><img src="${esc(f)}" loading="lazy"><div>seed ${seed}</div></td>`
          : `<td class=miss>—</td>`;
      }).join("");
      return `<tr><th>${esc(arm.key)}</th>${cells}</tr>`;
    }).join("");
    return `<h2>${esc(s.slug)}</h2><div class=pr>${esc(s.prompt)}</div><table>${arms}</table>`;
  }).join("");

  const html = `<!doctype html><meta charset=utf-8><title>#81 — frame borders</title>
<style>
body{font:14px/1.5 system-ui;margin:2rem;background:#111;color:#eee}
img{width:220px;height:220px;display:block}
table{border-collapse:collapse;margin:.5rem 0 2rem}
th{text-align:right;padding-right:.75rem;font-weight:600;white-space:nowrap}
td{padding:2px;text-align:center;font-size:11px;color:#888}
td.miss{color:#555}
.pr{color:#9a9;font-style:italic}
</style>
<h1>#81 — does the frame follow the arm or the seed?</h1>
<p>Rows are treatments, columns are seeds. Judge by eye: a decorative frame is a
border the card's art sits <em>inside</em>, not a flush horizon or a flat sky.</p>
${rows}`;

  const out = join(OUT_DIR, "sheet.html");
  writeFileSync(out, html);
  console.log(`sheet ${out}`);
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  const argv = process.argv.slice(2);

  if (argv.includes("--sheet")) return sheet();

  for (const arm of ARMS) {
    for (const s of SUBJECTS) {
      for (const seed of SEEDS) {
        await generate(s.slug, s.prompt, seed, arm);
      }
    }
  }
  await pollinationsControl();
  sheet();
}

void main();
