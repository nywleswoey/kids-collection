/**
 * PROTOTYPE — #74. Throwaway. Do not import this from anything.
 *
 * The question, in two halves:
 *
 *   1. WHICH MODEL. AI Horde has no default, and the choice is not cosmetic.
 *      `waiting_prompt.py` computes `max_res = 1024 + threads*10 - round(queue*0.9)`
 *      for a request that names no model, so 768x768 is a coin-flip against live
 *      queue depth. Naming a model whose baseline is `stable_diffusion_xl`,
 *      `stable_cascade` or `flux_1` forces `max_res` to 1024 unconditionally.
 *      Leaving `models` unset is also a CONTENT risk, not only a resolution one:
 *      the highest-worker-count image models on the horde are NSFW.
 *
 *   2. DOES THE ESCAPE HATCH ACTUALLY DRAW. #71 keyed AI Horde for permission —
 *      it is the only shortlisted provider whose content policy plainly allows
 *      weapon-bearing subjects. Permission is not skill. If a volunteer-run SDXL
 *      draws warriors no better than Cloudflare's SDXL, the hatch is permission
 *      to produce the same 3-of-28, and the honest outcome is to reverse #71.
 *
 * So this run is a grid: the three hard subjects from `seed/NEW-THEME-RUNBOOK.md`
 * plus one control, drawn several times by each candidate model AND by the two
 * providers already in the seam. The reference columns are what make the verdict
 * decidable — "no better than Cloudflare" needs Cloudflare in the picture, and
 * the control needs Pollinations drawing it well for "different" not to be
 * mistaken for "better".
 *
 * It produces EVIDENCE and nothing else. The seam is #67's; the adapter that
 * carries the winning model is landed separately, from this run's verdict.
 *
 *   pnpm prototype:74 --dry-run    price it, check the models are online, submit nothing
 *   pnpm prototype:74              run it; resumes, so an interrupted run is cheap
 *   pnpm prototype:74 --hard-only  skip the control in the HORDE columns only, once
 *                                  it has drawn the control at least once
 *   pnpm prototype:74 --sheet-only rebuild the sheet from disk, generate nothing
 *
 * Output (gitignored scratch): seed/review/prototype-74/
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildPrompt } from "@/features/pool/prompt";
import { CARD_SIZE, cloudflareSdxl, pollinations } from "@/features/pool/providers";
import { readImageSize } from "@/features/pool/image-size";
import { slug } from "@/features/pool/keys";

const OUT_DIR = join(process.cwd(), "seed", "review", "prototype-74");
const HORDE = "https://aihorde.net/api/v2";
const CLIENT_AGENT = "kids-collection-prototype-74:1.0:github.com/nywleswoey/kids-collection";

/** Samples per (subject, column). One sample is noise — these failures are probabilistic. */
const SAMPLES = 3;
/** Fixed so a re-run redraws the same grid rather than a new lottery. */
const BASE_SEED = 74;

/**
 * The three failure classes from the runbook, one subject each, plus a control.
 *
 * Real cards, by name, so the prompts are the ones the pipeline actually sends —
 * a hand-tuned prompt would prove nothing about the pipeline.
 */
const SUBJECTS = [
  { card: "Longbowman", failureClass: "identity rests on a small held object", control: false },
  { card: "Swiss Guard", failureClass: "identity rests on niche uniform accuracy", control: false },
  { card: "Egyptian Charioteer", failureClass: "multi-object scene", control: false },
  {
    card: "Warhorse",
    failureClass: "CONTROL — dodges all three; Pollinations draws it well",
    control: true,
  },
] as const;

interface HordeColumn {
  kind: "horde";
  id: string;
  /** Exact catalogue name. Pinned — see the header. */
  model: string;
  /** Why this model earned one of the three slots. */
  because: string;
  steps: number;
  cfgScale: number;
}

interface RefColumn {
  kind: "ref";
  id: string;
  because: string;
}

type Column = HordeColumn | RefColumn;

/**
 * Three candidates, not seven. Each is here for a different reason, and every
 * one has an `stable_diffusion_xl`/`flux_1` baseline — which is the half of the
 * choice that makes 768x768 a guarantee rather than a coin-flip.
 *
 * Steps and CFG are NOT uniform across the three, deliberately. #71 fixed the
 * request's ROUTING parameters (`slow_workers`, `replacement_filter`,
 * `allow_downgrade`, `nsfw`, model) and those are identical below. Sampling
 * parameters are a property of the architecture: Schnell is a 4-8 step
 * distilled model at CFG 1, so running it at SDXL's 25/7.5 would produce a burnt
 * image, cost 3x the kudos, and answer a question nobody asked.
 */
const COLUMNS: readonly Column[] = [
  {
    kind: "horde",
    id: "horde-albedobase-xl",
    model: "AlbedoBase XL (SDXL)",
    because: "SDXL baseline, generalist, most workers of any SFW SDXL-class model",
    steps: 25,
    cfgScale: 7.5,
  },
  {
    kind: "horde",
    id: "horde-fustercluck",
    model: "Fustercluck",
    because: "style=artistic — the catalogue entry that reads closest to ART_STYLE's cartoon",
    steps: 25,
    cfgScale: 7.5,
  },
  {
    kind: "horde",
    id: "horde-flux-schnell",
    model: "Flux.1-Schnell fp8 (Compact)",
    because:
      "#62 established Cloudflare's flux-1-schnell cannot do 768x768 at any setting " +
      "(no width/height in its schema), so the horde is the only free route to FLUX at card size",
    steps: 8,
    cfgScale: 1,
  },
  {
    kind: "ref",
    id: "ref-cloudflare-sdxl",
    because: "the bar. 'No better than Cloudflare' is undecidable without Cloudflare in the grid",
    },
  {
    kind: "ref",
    id: "ref-pollinations",
    because: "calibrates the control, so 'different' is not mistaken for 'better'",
  },
];

interface Cell {
  subject: string;
  columnId: string;
  sample: number;
  file?: string;
  /** What the response NAMED, never what was requested (#64). */
  model?: string;
  worker?: string;
  seed?: string;
  /** Per-worker censorship: a black frame rather than a refusal. #71 accepted this risk sight-unseen. */
  censored?: boolean;
  error?: string;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const hardOnly = process.argv.includes("--hard-only");
  const sheetOnly = process.argv.includes("--sheet-only");
  mkdirSync(OUT_DIR, { recursive: true });

  const cards = loadSubjects();

  // Rebuild the sheet from whatever is on disk, generating nothing.
  //
  // Needed because a run at this queue depth takes hours and is routinely
  // interrupted, and a grid does not have to be COMPLETE to be decidable — it
  // has to be honest about which cells are empty, which the renderer already is.
  // Without this the sheet only exists if a run reaches its final line, so an
  // interrupted run leaves hours of paid-for images unreadable on disk.
  if (sheetOnly) {
    const cells = cellsFromDisk(cards);
    writeFileSync(join(OUT_DIR, "sheet.html"), renderSheet(cards, cells));
    console.log(`${cells.length} cell(s) on disk`);
    console.log(`open ${join(OUT_DIR, "sheet.html")}`);
    return;
  }
  await preflight(cards, dryRun);
  if (dryRun) return;

  const cells: Cell[] = [];
  await Promise.all([
    // ONE horde job in flight at a time, across all three models.
    //
    // The first run fanned the three models out in parallel and lost 27 of 46
    // images to `HTTP 404` on /generate/check — the horde had dropped the
    // requests out from under them. At 0-14 kudos the horde will not hold nine
    // pending images (~600 kudos of work) for a user who cannot cover them, and
    // an expired request is not recoverable, only resubmittable to the back of
    // the queue. Serialised, one job is ~70-174 kudos and survives.
    //
    // Slower in principle, far faster in practice: the parallel run spent its
    // wall-clock generating 404s.
    (async () => {
      // `--hard-only` drops the CONTROL from the horde columns once the horde
      // has already drawn it. The control's job is to prove the horde can draw
      // *something* well, so that a bad hard subject reads as a failure of the
      // subject rather than of the provider — and one or two models answering it
      // discharges that job completely. Every further control image is queue
      // time not spent on the question the ticket actually asks.
      const forHorde = hardOnly ? cards.filter((c) => !c.control) : cards;
      for (const col of COLUMNS) {
        if (col.kind === "horde") await hordeLane(col, forHorde, cells);
      }
    })(),
    ...COLUMNS.filter((c) => c.kind === "ref").map((col) => refLane(col as RefColumn, cards, cells)),
  ]);

  writeFileSync(join(OUT_DIR, "run.json"), JSON.stringify({ subjects: SUBJECTS, cells }, null, 2));
  writeFileSync(join(OUT_DIR, "sheet.html"), renderSheet(cards, cells));

  const censored = cells.filter((c) => c.censored).length;
  const failed = cells.filter((c) => c.error).length;
  console.log(
    `\ndone — ${cells.filter((c) => c.file).length}/${cells.length} images, ` +
      `${failed} failed, ${censored} censored by a worker`,
  );
  console.log(`open ${join(OUT_DIR, "sheet.html")}`);
}

/**
 * Reconstruct the grid from the files on disk, enriched with whatever `run.json`
 * remembers about each cell (the serving model, the worker, censorship).
 *
 * Disk is the authority on PRESENCE and `run.json` only annotates, deliberately:
 * the two disagree after an interrupted run, and the images are the thing that
 * was paid for.
 */
function cellsFromDisk(cards: readonly Subject[]): Cell[] {
  let remembered: Cell[] = [];
  try {
    remembered = (JSON.parse(readFileSync(join(OUT_DIR, "run.json"), "utf8")) as { cells: Cell[] })
      .cells;
  } catch {
    // No previous run recorded — presence alone still renders a readable grid.
  }

  const onDisk = new Set(readdirSync(OUT_DIR));
  const cells: Cell[] = [];
  for (const card of cards) {
    for (const col of COLUMNS) {
      for (let i = 0; i < SAMPLES; i++) {
        const file = ["webp", "png", "jpeg", "jpg"]
          .map((ext) => cellName(col.id, card.name, i, ext))
          .find((f) => onDisk.has(f));
        if (!file) continue;
        const prior = remembered.find(
          (c) => c.subject === card.name && c.columnId === col.id && c.sample === i,
        );
        cells.push({ ...prior, subject: card.name, columnId: col.id, sample: i, file });
      }
    }
  }
  return cells;
}

// ── subjects ────────────────────────────────────────────────────────────────

interface Subject {
  name: string;
  failureClass: string;
  control: boolean;
  imagePrompt: string;
  prompt: string;
}

function loadSubjects(): Subject[] {
  const seed = JSON.parse(readFileSync(join(process.cwd(), "seed", "cards.json"), "utf8")) as {
    themes: { name: string; cards: { name: string; imagePrompt: string }[] }[];
  };
  const all = seed.themes.flatMap((t) => t.cards);
  return SUBJECTS.map((s) => {
    const card = all.find((c) => c.name === s.card);
    if (!card) throw new Error(`no card named "${s.card}" in seed/cards.json`);
    return {
      name: card.name,
      failureClass: s.failureClass,
      control: s.control,
      imagePrompt: card.imagePrompt,
      // Through buildPrompt, so ART_STYLE and the real prompt length are exercised.
      prompt: buildPrompt(card),
    };
  });
}

// ── preflight ───────────────────────────────────────────────────────────────

/**
 * Everything that can be checked before a single kudo is spent.
 *
 * The `max_res` line is the evidence for half of this ticket: it prints what an
 * unpinned request would be allowed to ask for RIGHT NOW, next to the 768 the
 * app requires.
 */
async function preflight(cards: Subject[], dryRun: boolean) {
  const key = requireKey();

  const online = (await getJson(`${HORDE}/status/models?type=image`)) as {
    name: string;
    count: number;
    jobs: number;
    eta: number;
  }[];
  const perf = (await getJson(`${HORDE}/status/performance`)) as {
    queued_requests: number;
    thread_count: number;
  };
  const user = (await getJson(`${HORDE}/find_user`, { apikey: key })) as {
    username: string;
    kudos: number;
  };

  const unpinnedMaxRes =
    1024 + perf.thread_count * 10 - Math.round(perf.queued_requests * 0.9);
  console.log(`horde: ${perf.thread_count} threads, ${perf.queued_requests} queued`);
  console.log(
    `  an UNPINNED request would be capped at ${unpinnedMaxRes}px — ` +
      `${unpinnedMaxRes >= CARD_SIZE.width ? "768 clears" : `768 would be REFUSED`}`,
  );
  console.log(`  user ${user.username}, ${user.kudos} kudos`);

  for (const col of COLUMNS) {
    if (col.kind !== "horde") continue;
    const m = online.find((o) => o.name === col.model);
    console.log(
      m
        ? `  ✓ ${col.model} — ${m.count} worker(s), ${m.jobs} queued, eta ${m.eta}s`
        : `  ✗ ${col.model} — OFFLINE right now (volunteer infrastructure; the set moves)`,
    );
  }

  // The ticket says to re-check the candidate set at run time, because this is
  // volunteer infrastructure and the shortlist it printed has already moved.
  // Printing the whole live SFW SDXL-class field is what makes "these three"
  // a choice rather than a copy — and it is the only way an offline candidate
  // gets replaced by a real one rather than by a blank column.
  const reference = (await getJson(
    "https://raw.githubusercontent.com/Haidra-Org/AI-Horde-image-model-reference/main/stable_diffusion.json",
  )) as Record<string, { baseline?: string; nsfw?: boolean; style?: string }>;
  const chosen = new Set(COLUMNS.filter((c) => c.kind === "horde").map((c) => (c as HordeColumn).model));
  const field = online
    .filter((o) => {
      const ref = reference[o.name];
      // Only baselines that force max_res to 1024, and only SFW ones.
      return (
        ref?.nsfw === false &&
        ["stable_diffusion_xl", "stable_cascade", "flux_1"].includes(ref.baseline ?? "")
      );
    })
    .sort((a, b) => b.count - a.count);
  console.log(`\nlive SFW SDXL-class field (${field.length} online, ${chosen.size} chosen):`);
  for (const m of field) {
    console.log(
      `  ${chosen.has(m.name) ? "*" : " "} ${String(m.count).padStart(2)}w  ${m.name}  ` +
        `[${reference[m.name]?.baseline}, ${reference[m.name]?.style}]`,
    );
  }
  console.log("");

  // Price it before committing, per the ticket.
  let total = 0;
  for (const col of COLUMNS) {
    if (col.kind !== "horde") continue;
    const priced = (await postJson(`${HORDE}/generate/async`, key, {
      ...hordePayload(col, cards[0]!.prompt),
      dry_run: true,
    })) as { kudos?: number; message?: string };
    if (priced.kudos === undefined) {
      console.log(`  ! ${col.model} dry-run refused: ${priced.message ?? "unknown"}`);
      continue;
    }
    total += priced.kudos * cards.length;
    console.log(`  ${col.model}: ${priced.kudos} kudos per subject (${SAMPLES} samples)`);
  }
  console.log(`estimated total: ~${Math.round(total)} kudos`);
  if (dryRun) console.log("\n--dry-run: nothing submitted.");
}

function requireKey(): string {
  const key = process.env.AIHORDE_API_KEY;
  if (!key) throw new Error("AIHORDE_API_KEY is not set — see .env.example");
  return key;
}

// ── AI Horde lane ───────────────────────────────────────────────────────────

/**
 * #71's routing parameters, unchanged and in one place:
 *   slow_workers: true        — do not exclude the slow volunteers; at 0 kudos they are the queue
 *   replacement_filter: false — never let the horde silently rewrite the prompt
 *   allow_downgrade           — NEVER SET. Setting it permits a smaller image than asked for,
 *                               which is the exact failure the model pin exists to prevent.
 *   nsfw: false               — an SFW request. Also what exposes it to per-worker censorship.
 *   models: [one]             — pinned. Unset is a resolution risk AND a content risk.
 */
function hordePayload(col: HordeColumn, prompt: string) {
  return {
    prompt,
    params: {
      width: CARD_SIZE.width,
      height: CARD_SIZE.height,
      steps: col.steps,
      cfg_scale: col.cfgScale,
      sampler_name: "k_euler_a",
      karras: true,
      n: SAMPLES,
      seed: String(BASE_SEED),
    },
    nsfw: false,
    models: [col.model],
    slow_workers: true,
    replacement_filter: false,
    r2: true,
    shared: false,
    trusted_workers: false,
  };
}

async function hordeLane(col: HordeColumn, cards: Subject[], cells: Cell[]) {
  const key = requireKey();
  for (const card of cards) {
    if (allSamplesOnDisk(col.id, card.name)) {
      console.log(`  · ${card.name} [${col.id}] already on disk`);
      continue;
    }
    try {
      await hordeGenerate(col, card, key, cells);
    } catch (err) {
      console.error(`  ✗ ${card.name} [${col.id}]: ${String(err)}`);
      for (let i = 0; i < SAMPLES; i++) {
        cells.push({ subject: card.name, columnId: col.id, sample: i, error: String(err) });
      }
    }
  }
}

/**
 * Submit, poll, download. Requests go stale after ~10 minutes at the back of the
 * queue, so one resubmit is expected rather than exceptional.
 */
async function hordeGenerate(col: HordeColumn, card: Subject, key: string, cells: Cell[]) {
  // Four attempts, not two: a dropped job is the ordinary case at this kudos
  // balance, and each resubmit costs only queue position.
  for (let attempt = 0; attempt < 4; attempt++) {
    const submitted = (await postJson(
      `${HORDE}/generate/async`,
      key,
      hordePayload(col, card.prompt),
    )) as { id?: string; message?: string };
    if (!submitted.id) throw new Error(`submit refused: ${submitted.message ?? "no id"}`);

    console.log(`  → ${card.name} [${col.id}] queued as ${submitted.id}`);
    const done = await pollUntilDone(submitted.id, key, `${card.name} [${col.id}]`);
    if (!done) {
      console.warn(`  ⟳ ${card.name} [${col.id}] gave up after 90min — resubmitting`);
      // Through the gate like every other horde call: the 2-per-second limit is
      // per-IP across the whole API, and a cancel that skips the gate can be the
      // request that gets a real submission thrown away.
      await hordeGate();
      await fetch(`${HORDE}/generate/status/${submitted.id}`, {
        method: "DELETE",
        headers: { apikey: key, "Client-Agent": CLIENT_AGENT },
      });
      continue;
    }

    const status = (await getJson(`${HORDE}/generate/status/${submitted.id}`, {
      apikey: key,
    })) as {
      generations: {
        img: string;
        seed: string;
        model: string;
        worker_name: string;
        censored?: boolean;
      }[];
    };
    for (const [i, gen] of status.generations.entries()) {
      const cell: Cell = {
        subject: card.name,
        columnId: col.id,
        sample: i,
        model: gen.model,
        worker: gen.worker_name,
        seed: gen.seed,
        censored: gen.censored === true,
      };
      try {
        cell.file = await saveImage(col.id, card.name, i, await downloadBytes(gen.img));
      } catch (err) {
        cell.error = String(err);
      }
      cells.push(cell);
    }
    console.log(`  ✓ ${card.name} [${col.id}] — ${status.generations.length} image(s)`);
    return;
  }
  throw new Error("the horde dropped this job on all 4 attempts");
}

/**
 * Poll until done.
 *
 * The deadline is deliberately huge. Measured on this prototype's second run: a
 * 20-minute client deadline made all three lanes abandon jobs that had reached
 * queue position 58 of 800 and resubmit to the BACK of that queue. The horde
 * expires a request nobody CHECKS, not one that is merely slow, so polling keeps
 * a job alive and giving up is a pure self-inflicted loss.
 */
async function pollUntilDone(id: string, key: string, label: string): Promise<boolean> {
  const deadline = Date.now() + 90 * 60_000;
  let lastLog = 0;
  while (Date.now() < deadline) {
    await sleep(8_000);
    let check: {
      done: boolean;
      faulted: boolean;
      is_possible: boolean;
      finished: number;
      queue_position: number;
      wait_time: number;
    };
    try {
      check = (await getJson(`${HORDE}/generate/check/${id}`, { apikey: key })) as typeof check;
    } catch (err) {
      // THIS is what "requests go stale" looks like on the wire: the horde
      // forgets the job and /check answers 404. It is not a client timeout, and
      // it fires while the job is still advancing in the queue — so it must
      // resubmit rather than fail the cell.
      if (String(err).includes("404")) {
        console.warn(`    ⟳ ${label}: the horde dropped this job (404) — resubmitting`);
        return false;
      }
      // A network blip is not a verdict on the model. Keep polling.
      console.warn(`    … ${label}: ${String(err)} — retrying`);
      continue;
    }
    if (check.done) return true;
    if (check.faulted) throw new Error("horde reported the request faulted");
    if (!check.is_possible) throw new Error("no worker can serve this request");
    if (Date.now() - lastLog > 60_000) {
      lastLog = Date.now();
      console.log(
        `    … ${label}: ${check.finished}/${SAMPLES} done, ` +
          `queue position ${check.queue_position}, ~${check.wait_time}s`,
      );
    }
  }
  return false;
}

// ── reference lanes ─────────────────────────────────────────────────────────

/**
 * The two providers already in the seam, drawn through their own adapters.
 *
 * Both adapters pin `seed: 42` (#64), which for a benchmark column is exactly
 * wrong — three identical bytes is one sample, not three. So the seed is varied
 * per sample here. That is a prototype liberty and the reason this lane does not
 * go through `runBakeOff`: the seam is built to hold a param bag STILL, and this
 * run needs it to move.
 */
async function refLane(col: RefColumn, cards: Subject[], cells: Cell[]) {
  const isPollinations = col.id === "ref-pollinations";
  const minIntervalMs = isPollinations ? 5_000 : 250;

  for (const card of cards) {
    for (let i = 0; i < SAMPLES; i++) {
      if (existsSync(join(OUT_DIR, cellName(col.id, card.name, i, "png"))) ||
          existsSync(join(OUT_DIR, cellName(col.id, card.name, i, "jpeg")))) {
        continue;
      }
      await sleep(minIntervalMs);
      const seed = BASE_SEED + i;
      const provider = isPollinations
        ? withSeed(pollinations(), seed)
        : withSeed(cloudflareSdxl(), seed);
      const cell: Cell = { subject: card.name, columnId: col.id, sample: i, seed: String(seed) };
      try {
        const image = await provider.generate(card.prompt, CARD_SIZE);
        cell.model = image.model;
        cell.file = await saveImage(col.id, card.name, i, image.bytes, image.format);
        console.log(`  ✓ ${card.name} [${col.id}] #${i}`);
      } catch (err) {
        cell.error = String(err);
        console.error(`  ✗ ${card.name} [${col.id}] #${i}: ${String(err)}`);
      }
      cells.push(cell);
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

function cellName(columnId: string, subject: string, sample: number, ext: string): string {
  return `${slug(subject)}--${columnId}--${sample}.${ext}`;
}

function allSamplesOnDisk(columnId: string, subject: string): boolean {
  return Array.from({ length: SAMPLES }, (_, i) =>
    ["webp", "png", "jpeg"].some((ext) =>
      existsSync(join(OUT_DIR, cellName(columnId, subject, i, ext))),
    ),
  ).every(Boolean);
}

async function saveImage(
  columnId: string,
  subject: string,
  sample: number,
  bytes: Uint8Array,
  format?: string,
): Promise<string> {
  const ext = format ?? readImageSize(bytes)?.format ?? "bin";
  const name = cellName(columnId, subject, sample, ext);
  writeFileSync(join(OUT_DIR, name), bytes);
  return name;
}

/**
 * Fetch the generated bytes, with retries.
 *
 * The horde hands back a short-lived R2 URL, and the first run reported
 * "Egyptian Charioteer [horde-flux-schnell] — 3 image(s)" while saving none of
 * them: the images were drawn, queued for, and paid for, then lost on the last
 * hop. Worth three attempts.
 */
async function downloadBytes(url: string): Promise<Uint8Array> {
  let last = "";
  for (let n = 0; n < 3; n++) {
    try {
      const res = await fetch(url);
      if (res.ok) return new Uint8Array(await res.arrayBuffer());
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = String(err);
    }
    await sleep(1_500 * 2 ** n);
  }
  throw new Error(`download failed after 3 attempts: ${last}`);
}

// ── contact sheet ───────────────────────────────────────────────────────────

function renderSheet(cards: Subject[], cells: Cell[]): string {
  const cell = (subject: string, columnId: string, sample: number) =>
    cells.find((c) => c.subject === subject && c.columnId === columnId && c.sample === sample);

  const head = COLUMNS.map(
    (c) =>
      `<th><div class=cid>${esc(c.id)}</div>` +
      `<div class=why>${esc(c.kind === "horde" ? c.model : "already in the seam")}</div>` +
      `<div class=why>${esc(c.because)}</div></th>`,
  ).join("");

  const rows = cards
    .map(
      (card) => `<tr>
<th scope=row><b>${esc(card.name)}</b>
<div class=fc>${esc(card.failureClass)}</div>
<div class=pr>${esc(card.imagePrompt)}</div></th>
${COLUMNS.map((col) => {
  const strip = Array.from({ length: SAMPLES }, (_, i) => {
    const c = cell(card.name, col.id, i);
    if (!c) return `<div class=miss>not run</div>`;
    if (c.error) return `<div class=miss title="${esc(c.error)}">FAILED</div>`;
    if (c.censored) return `<div class=cens>CENSORED by worker</div>`;
    return `<img src="${esc(c.file ?? "")}" loading=lazy alt="${esc(card.name)} #${i}">`;
  }).join("");
  const witness = cells.find((c) => c.subject === card.name && c.columnId === col.id && c.model);
  return `<td><div class=strip>${strip}</div><div class=m>${esc(
    witness?.model ?? "model not reported",
  )}${witness?.worker ? ` · ${esc(witness.worker)}` : ""}</div></td>`;
}).join("")}
</tr>`,
    )
    .join("\n");

  const censored = cells.filter((c) => c.censored).length;
  const failed = cells.filter((c) => c.error).length;

  return `<!doctype html><meta charset=utf-8><title>#74 — AI Horde model bake-off</title>
<style>
body{font:14px system-ui;background:#111;color:#eee;margin:24px}
h1{font-size:20px;margin:0 0 4px}
.sub{opacity:.65;margin:0 0 16px;max-width:80ch;line-height:1.5}
.warn{background:#3a2410;border-left:3px solid #d78c33;padding:8px 12px;margin:8px 0}
table{border-collapse:collapse;width:100%}
th,td{vertical-align:top;padding:8px;border-top:1px solid #2a2a2a}
thead th{position:sticky;top:0;background:#111;text-align:left;font-size:12px}
th[scope=row]{text-align:left;width:200px;font-weight:400}
.strip{display:grid;grid-template-columns:repeat(${SAMPLES},1fr);gap:4px}
img{width:100%;border-radius:6px;display:block;background:#222}
.cid{font-weight:600;font-size:13px}
.why{opacity:.6;font-weight:400;font-size:11px;margin-top:3px;line-height:1.4;text-transform:none;letter-spacing:0}
.fc{opacity:.75;font-size:12px;margin-top:6px;color:#d78c33}
.pr{opacity:.5;font-size:11px;margin-top:6px;line-height:1.4}
.m{font-size:11px;opacity:.55;margin-top:6px}
.miss{color:#f66;border:1px dashed #f66;border-radius:6px;padding:20px 4px;text-align:center;font-size:11px}
.cens{color:#f6f;border:1px dashed #f6f;border-radius:6px;padding:20px 4px;text-align:center;font-size:11px}
</style>
<h1>#74 — which AI Horde model, and does the escape hatch draw the hard subjects?</h1>
<p class=sub>Rows are the three failure classes from <code>NEW-THEME-RUNBOOK.md</code> plus one control.
Columns are the three AI Horde candidates and the two providers already in the seam. Prompts are real
<code>buildPrompt()</code> output at 768&times;768, ${SAMPLES} samples each.
<b>The verdict is yours.</b> The hatch earns its keep only if a horde column draws a hard subject
better than <code>ref-cloudflare-sdxl</code> does; if it does not, the honest outcome is to reverse #71
and drop AI Horde entirely.</p>
${
  censored > 0
    ? `<p class=warn>⚠ ${censored} frame(s) were censored by a worker — a black frame rather than a refusal. #71 accepted this risk on the grounds it fails visibly into review. This is the first measurement of how often it fires.</p>`
    : `<p class=sub>No worker censorship fired in this run.</p>`
}
${failed > 0 ? `<p class=warn>⚠ ${failed} cell(s) failed outright. Hover for the error.</p>` : ""}
<table><thead><tr><th>Subject</th>${head}</tr></thead><tbody>
${rows}
</tbody></table>`;
}

function esc(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

// ── http ────────────────────────────────────────────────────────────────────

/**
 * ONE gate in front of every AI Horde call, submits and polls alike.
 *
 * Measured, the hard way, on this prototype's first run: the horde answers
 * `429 {"message": "2 per 1 second"}` and the three lanes fanning out
 * concurrently lost 7 of 12 submissions to it in the first second. The limit is
 * per-IP across the whole API, not per-endpoint and not per-lane, so a
 * per-lane gate cannot express it — which is a fact about AI Horde's adapter
 * pacing, not only about this script.
 *
 * A submit refused this way costs nothing and is retryable, so it is retried
 * rather than counted as a failed cell. A cell that says FAILED must mean the
 * model could not draw the subject; it must never mean the script was impatient.
 */
const HORDE_MIN_INTERVAL_MS = 1_200;
let nextHordeSlot = 0;

async function hordeGate(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextHordeSlot - now);
  nextHordeSlot = Math.max(now, nextHordeSlot) + HORDE_MIN_INTERVAL_MS;
  if (wait > 0) await sleep(wait);
}

async function getJson(url: string, headers: Record<string, string> = {}): Promise<unknown> {
  for (let n = 0; ; n++) {
    await hordeGate();
    const res = await fetch(url, { headers: { "Client-Agent": CLIENT_AGENT, ...headers } });
    if (res.status === 429 && n < 5) {
      await sleep(2_000 * 2 ** n);
      continue;
    }
    if (!res.ok) throw new Error(`GET ${url} → HTTP ${res.status}`);
    return res.json();
  }
}

async function postJson(url: string, key: string, body: unknown): Promise<unknown> {
  for (let n = 0; ; n++) {
    await hordeGate();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        "Client-Agent": CLIENT_AGENT,
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { message?: string };
    if (res.status === 429 && n < 5) {
      console.log(`    ⟳ throttled (${json.message ?? "429"}) — backing off`);
      await sleep(2_000 * 2 ** n);
      continue;
    }
    return json;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
