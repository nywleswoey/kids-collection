/**
 * PROTOTYPE — #147. Throwaway. Do not import this from anything.
 *
 * THE QUESTION. #143 wants a worldwide spirits theme whose requested spine sits
 * on all three of the runbook's failure classes at once — a pair of animal-headed
 * guards (multi-object), a grandmother whose identity is a bowl of soup (small
 * held object, the disqualifying one), and a ghost whose identity is a specific
 * dress (niche costume). A figure that cannot be drawn cannot be a card, so this
 * has to be answered BEFORE the 30 are locked.
 *
 * It produces EVIDENCE — a contact sheet a human reads — and nothing else. The
 * verdict is #147's, from the sheet, not from this file.
 *
 * WHAT IT VARIES. Subject x wording-arm x lane, two samples each. The arms are
 * the runbook's own wording levers (`subjects.ts` explains each), so a failure
 * here is a failure of the lever the runbook already recommends, which is the
 * only kind of failure that changes the spec.
 *
 * WHAT IT HOLDS FIXED. `buildPrompt()` and `ART_STYLE` from the shipped seam, and
 * the shipped adapters — a hand-rolled request would prove nothing about the
 * pipeline. `ai-horde` is NOT here: it is the escape hatch, at 30-45 min an
 * image, and whether this theme needs it is the OUTPUT of reading this sheet.
 *
 * REPRODUCIBILITY, per the runbook: pollinations returns the same bytes for the
 * same prompt, cloudflare-sdxl does not, at any seed. So a cloudflare cell is one
 * roll of the dice and two samples are the minimum honest number; and nothing on
 * this sheet can be recovered by re-running it. Files on disk are the record.
 *
 *   pnpm prototype:147 --dry-run     print the grid and every prompt, generate nothing
 *   pnpm prototype:147               run it; resumes past anything already on disk
 *   pnpm prototype:147 --sheet-only  rebuild the sheet from disk, generate nothing
 *   pnpm prototype:147 --subjects=meng-po,pocong   narrow to some rows
 *   pnpm prototype:147 --providers=cloudflare-sdxl narrow to one lane
 *
 * Output (gitignored scratch): seed/review/prototype-147/
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPrompt } from "@/features/pool/prompt";
import { CARD_SIZE, cloudflareSdxl, pollinations } from "@/features/pool/providers";
import type { ImageProvider } from "@/features/pool/providers";
import { slug } from "@/features/pool/keys";
import { SUBJECTS, type Arm, type Subject } from "./subjects";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-147");
const SAMPLES = 2;
const BASE_SEED = 147;

interface Lane {
  id: string;
  make: () => ImageProvider;
  /** Gap between request STARTS. The adapters declare their own; these are the runbook's. */
  minIntervalMs: number;
  because: string;
}

const LANES: readonly Lane[] = [
  {
    id: "pollinations",
    make: pollinations,
    // One queued request per IP, 15s apart (runbook, Rate limits). It sets the
    // wall-clock floor for the whole run and there is no way to hurry it.
    minIntervalMs: 15_000,
    because: "asks for flux, served by sana (#64) — every published card came from this lane",
  },
  {
    id: "cloudflare-sdxl",
    make: cloudflareSdxl,
    minIntervalMs: 1_500,
    because: "the lane the runbook says rescues multi-object and niche-costume subjects",
  },
];

interface Cell {
  subject: string;
  arm: string;
  lane: string;
  sample: number;
  prompt: string;
  file?: string;
  /** What the response NAMED, never what was requested (#64). Cloudflare names nothing. */
  model?: string;
  error?: string;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sheetOnly = process.argv.includes("--sheet-only");
  const onlySubjects = listArg("--subjects=");
  const onlyLanes = listArg("--providers=");

  const subjects = onlySubjects
    ? SUBJECTS.filter((s) => onlySubjects.includes(slug(s.name)))
    : SUBJECTS;
  const lanes = onlyLanes ? LANES.filter((l) => onlyLanes.includes(l.id)) : LANES;

  mkdirSync(OUT_DIR, { recursive: true });

  if (sheetOnly) {
    const cells = cellsFromDisk();
    writeFileSync(join(OUT_DIR, "sheet.html"), renderSheet(cells));
    console.log(`${cells.length} cell(s) on disk`);
    console.log(`open ${join(OUT_DIR, "sheet.html")}`);
    return;
  }

  const planned = subjects.flatMap((s) =>
    s.arms.flatMap((a) =>
      lanes.flatMap((l) => Array.from({ length: SAMPLES }, (_, i) => ({ s, a, l, i }))),
    ),
  );
  const todo = planned.filter(({ s, a, l, i }) => !onDisk(l.id, s.name, a.id, i));
  console.log(
    `${subjects.length} subject(s), ${planned.length} image(s) planned, ` +
      `${planned.length - todo.length} already on disk, ${todo.length} to draw`,
  );
  for (const lane of lanes) {
    const n = todo.filter((t) => t.l.id === lane.id).length;
    console.log(
      `  ${lane.id.padEnd(16)} ${String(n).padStart(3)} image(s) ` +
        `· ~${Math.ceil((n * lane.minIntervalMs) / 60_000)} min`,
    );
  }

  if (dryRun) {
    for (const s of subjects) {
      console.log(`\n── ${s.name} — ${s.failureClass}`);
      for (const a of s.arms) console.log(`  [${a.id}] ${buildPrompt({ imagePrompt: a.prompt })}`);
    }
    return;
  }

  for (const lane of lanes) {
    const provider = lane.make();
    if (!provider.isConfigured()) {
      // Abort rather than quietly drop a lane: a lane absent from a comparison
      // reads as a lane that drew badly (providers/index.ts).
      throw new Error(`${lane.id} is not configured — set ${provider.requiredEnv.join(", ")}`);
    }
  }

  const cells: Cell[] = cellsFromDisk();
  // The lanes run alongside each other and pace themselves independently, so the
  // wall-clock is the slowest lane rather than the sum.
  await Promise.all(lanes.map((lane) => runLane(lane, subjects, cells)));

  writeFileSync(join(OUT_DIR, "run.json"), JSON.stringify({ cells }, null, 2));
  writeFileSync(join(OUT_DIR, "sheet.html"), renderSheet(cells));
  const failed = cells.filter((c) => c.error).length;
  console.log(`\ndone — ${cells.filter((c) => c.file).length} image(s) on disk, ${failed} failed`);
  console.log(`open ${join(OUT_DIR, "sheet.html")}`);
}

async function runLane(lane: Lane, subjects: readonly Subject[], cells: Cell[]) {
  for (const subject of subjects) {
    for (const arm of subject.arms) {
      for (let i = 0; i < SAMPLES; i++) {
        if (onDisk(lane.id, subject.name, arm.id, i)) continue;
        const seed = BASE_SEED + i;
        const provider = withSeed(lane.make(), seed);
        const prompt = buildPrompt({ imagePrompt: arm.prompt });
        const cell: Cell = {
          subject: subject.name,
          arm: arm.id,
          lane: lane.id,
          sample: i,
          prompt,
        };
        const started = Date.now();
        try {
          const image = await provider.generate(prompt, CARD_SIZE);
          cell.model = image.model;
          cell.file = cellName(lane.id, subject.name, arm.id, i, image.format ?? provider.format);
          writeFileSync(join(OUT_DIR, cell.file), image.bytes);
          console.log(`  ✓ ${lane.id} · ${subject.name} [${arm.id}] #${i}`);
        } catch (err) {
          cell.error = String(err);
          console.error(`  ✗ ${lane.id} · ${subject.name} [${arm.id}] #${i}: ${String(err)}`);
        }
        cells.push(cell);
        // Pace from the START of the request, not the end — the declared limits
        // are on request starts.
        const wait = lane.minIntervalMs - (Date.now() - started);
        if (wait > 0) await sleep(wait);
      }
    }
  }
}

/** Re-point an adapter at one seed. Throwaway — the seam intentionally forbids this. */
function withSeed<P extends { params: Readonly<Record<string, string | number | boolean>> }>(
  provider: P,
  seed: number,
): P {
  return { ...provider, params: { ...provider.params, seed } };
}

// ── files ───────────────────────────────────────────────────────────────────

const EXTS = ["png", "jpeg", "jpg", "webp"] as const;

function cellName(lane: string, subject: string, arm: string, sample: number, ext: string): string {
  return `${slug(subject)}--${arm}--${lane}--${sample}.${ext}`;
}

function onDisk(lane: string, subject: string, arm: string, sample: number): string | undefined {
  return EXTS.map((ext) => cellName(lane, subject, arm, sample, ext)).find((f) =>
    existsSync(join(OUT_DIR, f)),
  );
}

/**
 * Reconstruct the grid from the files on disk, annotated by whatever `run.json`
 * remembers. Disk is the authority on PRESENCE: the two disagree after an
 * interrupted run, and on a non-deterministic lane the images are the only
 * thing that cannot be re-made.
 */
function cellsFromDisk(): Cell[] {
  let remembered: Cell[] = [];
  try {
    remembered = (JSON.parse(readFileSync(join(OUT_DIR, "run.json"), "utf8")) as { cells: Cell[] })
      .cells;
  } catch {
    // No previous run recorded — presence alone still renders a readable grid.
  }
  const present = new Set(existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : []);
  const cells: Cell[] = [];
  for (const subject of SUBJECTS) {
    for (const arm of subject.arms) {
      for (const lane of LANES) {
        for (let i = 0; i < SAMPLES; i++) {
          const file = EXTS.map((ext) => cellName(lane.id, subject.name, arm.id, i, ext)).find((f) =>
            present.has(f),
          );
          const prior = remembered.find(
            (c) =>
              c.subject === subject.name &&
              c.arm === arm.id &&
              c.lane === lane.id &&
              c.sample === i,
          );
          if (!file && !prior?.error) continue;
          cells.push({
            subject: subject.name,
            arm: arm.id,
            lane: lane.id,
            sample: i,
            prompt: prior?.prompt ?? buildPrompt({ imagePrompt: arm.prompt }),
            model: prior?.model,
            error: file ? undefined : prior?.error,
            file,
          });
        }
      }
    }
  }
  return cells;
}

// ── contact sheet ───────────────────────────────────────────────────────────

function renderSheet(cells: readonly Cell[]): string {
  const rows = SUBJECTS.map((subject) => {
    const armRows = subject.arms
      .map((arm, n) => armRow(subject, arm, n === 0, cells))
      .join("\n");
    return armRows;
  }).join("\n");

  return `<!doctype html><meta charset=utf-8><title>#147 — can the lanes draw a worldwide spirits theme?</title>
<style>
body{font:14px system-ui;background:#111;color:#eee;margin:24px}
h1{font-size:20px;margin:0 0 4px}
.sub{opacity:.7;margin:0 0 16px;max-width:90ch;line-height:1.55}
table{border-collapse:collapse;width:100%}
th,td{vertical-align:top;padding:8px}
thead th{position:sticky;top:0;background:#111;text-align:left;font-size:12px;border-bottom:1px solid #333}
tr.first td,tr.first th{border-top:2px solid #444}
tr td,tr th{border-top:1px solid #232323}
th[scope=row]{text-align:left;width:230px;font-weight:400}
.arm{font-weight:600;font-size:13px}
.arm.banned{color:#d78c33}
.why{opacity:.6;font-size:11px;margin-top:4px;line-height:1.45}
.subj{font-size:15px;font-weight:700}
.fc{opacity:.8;font-size:11px;margin-top:5px;color:#d78c33;line-height:1.45}
.strip{display:grid;grid-template-columns:repeat(${SAMPLES},1fr);gap:5px}
img{width:100%;border-radius:6px;display:block;background:#222}
.miss{background:#1c1c1c;border:1px dashed #444;border-radius:6px;padding:18px 6px;text-align:center;font-size:11px;opacity:.6}
.pr{opacity:.55;font-size:11px;margin-top:6px;line-height:1.45;font-family:ui-monospace,monospace}
.m{font-size:10px;opacity:.5;margin-top:5px}
.lane{font-weight:600}
</style>
<h1>#147 — can the image lanes draw a worldwide spirits theme?</h1>
<p class=sub>Subject × wording arm × lane, ${SAMPLES} samples each. The arms are the runbook's own
wording levers. <b>plain</b> is the phrase a card would naturally carry; <b>lead</b> leads with the
defining object; <b>drop</b> drops it and lets clothing or silhouette carry the subject;
<b class=banned>banned</b> is <b>plain</b> with #145's banned-setting list pasted in as a negative
clause — the arm that tests whether that clause can live in an <code>imagePrompt</code> at all, or whether
#81's finding (naming a depictable noun puts it in the picture, in any polarity) generalises to it.
Cloudflare is not reproducible: each of its cells is one roll, and re-running draws a different picture.</p>
<table>
<thead><tr><th>subject / arm</th>${LANES.map(
    (l) => `<th><div class=lane>${esc(l.id)}</div><div class=why>${esc(l.because)}</div></th>`,
  ).join("")}</tr></thead>
<tbody>
${rows}
</tbody></table>`;
}

function armRow(subject: Subject, arm: Arm, first: boolean, cells: readonly Cell[]): string {
  const head = first
    ? `<div class=subj>${esc(subject.name)}</div><div class=fc>${esc(subject.failureClass)}</div>`
    : "";
  const lanesCells = LANES.map((lane) => {
    const strip = Array.from({ length: SAMPLES }, (_, i) => {
      const c = cells.find(
        (x) =>
          x.subject === subject.name && x.arm === arm.id && x.lane === lane.id && x.sample === i,
      );
      if (!c) return `<div class=miss>not run</div>`;
      if (!c.file) return `<div class=miss title="${esc(c.error ?? "")}">FAILED</div>`;
      return `<img src="${esc(c.file)}" loading=lazy alt="${esc(subject.name)} ${esc(arm.id)} #${i}">`;
    }).join("");
    const witness = cells.find(
      (x) => x.subject === subject.name && x.arm === arm.id && x.lane === lane.id && x.model,
    );
    return `<td><div class=strip>${strip}</div><div class=m>${esc(
      witness?.model ?? "model not reported",
    )}</div></td>`;
  }).join("");
  return `<tr${first ? " class=first" : ""}>
<th scope=row>${head}<div class="arm ${arm.id}">${esc(arm.id)}</div>
<div class=why>${esc(arm.because)}</div>
<div class=pr>${esc(arm.prompt)}</div></th>
${lanesCells}
</tr>`;
}

// ── odds and ends ───────────────────────────────────────────────────────────

function listArg(flag: string): string[] | undefined {
  return process.argv
    .find((a) => a.startsWith(flag))
    ?.slice(flag.length)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

void main();
