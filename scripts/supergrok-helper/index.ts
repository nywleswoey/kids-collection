/**
 * SuperGrok manual-lane walker — runbook Step 6's hand-drawn `supergrok-manual`
 * lane, scripted so copying each prompt, saving each picture, and moving it
 * into `seed-content/supergrok-drop/` under the exact expected filename is no
 * longer a manual, error-prone chore.
 *
 *   pnpm supergrok "<Theme Name>"
 *
 * For each card in the theme (in seed order): copy its exact prompt (the same
 * text every other provider gets, `ART_STYLE` included) to the clipboard via
 * `pbcopy`; once the captain presses Enter, watch `~/Downloads` for a
 * `.png`/`.jpg`/`.jpeg`/`.webp` file saved since the copy. When one appears,
 * move it into the drop folder under the card's
 * expected filename (stem from `manualDropStem`, extension from whatever was
 * actually saved) and move on to the next card.
 *
 * A card the drop folder already has a matching picture for (by prompt hash,
 * same rule `findDropFile` uses for import) is skipped — reruns resume rather
 * than re-asking for pictures already saved. `skip` leaves a card for a later
 * run; `redo` re-copies the prompt and waits again; `quit` stops the walk
 * early without losing what was already dropped.
 *
 * Hard rule for the default (manual) mode: no Grok calls of any kind, no
 * browser automation, no network calls, no credentials. Both modes never open
 * `DATABASE_URL` — `loadSeed` only reads `seed-content/cards.json`. Once the
 * walk finishes (or is stopped early), it hands off to the two existing,
 * already-documented commands that DO need the database — `pnpm seed
 * --review --providers=supergrok-manual` to import what was dropped, then
 * `pnpm contact-sheet` to build the comparison sheet — rather than
 * reimplementing either.
 *
 * `--auto` (`pnpm supergrok "<Theme Name>" --auto`) reuses the same plan,
 * naming, and resume logic but skips the clipboard/Downloads dance: it
 * drives the locally installed Grok Build CLI (`grok -p`, signed in with the
 * owner's SuperGrok subscription, built-in image generation, no xAI API key)
 * headless, one card at a time, with each card's exact prompt plus
 * instructions for square output and an exact save path (see `auto.ts`).
 * Still no API keys, no browser automation, no network calls of its own
 * beyond the `grok` CLI, and the same two hand-off commands at the end. The
 * clipboard walk above stays the default.
 *
 * `--auto-video` (`pnpm supergrok "<Theme Name>" --auto-video`) is the
 * separate manual ANIMATION lane (`data/kcanim/report.md`): for every
 * legendary card in the theme that already has an approved still in
 * `seed-content/review/`, it drives `grok`'s `image_to_video` tool on that
 * still (not a prompt — `image_to_video` animates existing art) and converts
 * the clip to a seamless looping animated WebP with local `ffmpeg`/`img2webp`
 * (neither calls a network), dropping the result into
 * `seed-content/supergrok-drop-anim/`. `pnpm seed --review` then imports it
 * next to the still, and `pnpm contact-sheet` shows it. No xAI API key, no
 * browser automation.
 */
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { findDropFile, SUPERGROK_DROP_DIR, type ManualBriefEntry } from "@/shared/pool/manual-brief";
import { ANIMATED_DROP_DIR } from "@/shared/pool/animated-brief";
import { loadSeed } from "@/shared/pool/loader";
import { parseSupergrokArgs, SupergrokArgsError } from "./args";
import { type AutoCardFailure, type GrokRunResult, isAutoCardFailure, runAutoCard } from "./auto";
import {
  type AutoVideoFailure,
  type ConvertResult,
  type GrokVideoRunResult,
  isAutoVideoFailure,
  runAutoVideoCard,
} from "./auto-video";
import { pickNewestImageSince, type DirEntrySnapshot } from "./downloads";
import { destFileName } from "./naming";
import { planThemeEntries, ThemeNotFoundError } from "./plan";
import { planLegendaryVideoEntries } from "./video-plan";

const SEED_PATH = join(process.cwd(), "seed-content", "cards.json");
const DROP_DIR = join(process.cwd(), SUPERGROK_DROP_DIR);
const ANIMATED_DROP_DIR_ABS = join(process.cwd(), ANIMATED_DROP_DIR);
const REVIEW_DIR = join(process.cwd(), "seed-content", "review");
const DOWNLOADS_DIR = join(homedir(), "Downloads");

const POLL_MS = 1000;
const STABLE_WAIT_MS = 700;
const WAIT_TIMEOUT_MS = 10 * 60 * 1000;

function listDropFileNames(): string[] {
  if (!existsSync(DROP_DIR)) return [];
  return readdirSync(DROP_DIR, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name);
}

function snapshotDownloads(): DirEntrySnapshot[] {
  if (!existsSync(DOWNLOADS_DIR)) return [];
  return readdirSync(DOWNLOADS_DIR, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => ({ name: e.name, mtimeMs: statSync(join(DOWNLOADS_DIR, e.name)).mtimeMs }));
}

function copyToClipboard(text: string): void {
  execFileSync("pbcopy", [], { input: text });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Waits for a new image to land and settle (stop growing) in Downloads. */
async function waitForNewImage(sinceMs: number, timeoutMs: number): Promise<string | undefined> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = pickNewestImageSince(snapshotDownloads(), sinceMs);
    if (hit) {
      const path = join(DOWNLOADS_DIR, hit.name);
      const before = statSync(path).size;
      await sleep(STABLE_WAIT_MS);
      if (existsSync(path) && statSync(path).size === before) return hit.name;
    }
    await sleep(POLL_MS);
  }
  return undefined;
}

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim().toLowerCase())));
}

/** Real `grok -p` invocation, wrapped so `auto.ts` stays spawn-free and testable. */
function runGrokHeadless(prompt: string, cwd: string, timeoutMs: number): GrokRunResult {
  const result = spawnSync(
    "grok",
    ["-p", prompt, "--output-format", "json", "--always-approve", "--cwd", cwd],
    { cwd, timeout: timeoutMs, encoding: "utf8" },
  );
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT") return { ok: false, timedOut: true };
  if (result.error) return { ok: false, timedOut: false, error: result.error.message };
  if (result.signal) return { ok: false, timedOut: false, error: `grok killed by ${result.signal}` };
  if (result.status !== 0) {
    const output = (result.stderr || result.stdout || "").trim();
    return {
      ok: false,
      timedOut: false,
      error: `grok exited with status ${result.status}${output ? `: ${output}` : ""}`,
    };
  }
  return { ok: true, timedOut: false };
}

/** True when a `grok` executable can be spawned at all (not ENOENT). */
function grokCliAvailable(): boolean {
  const probe = spawnSync("grok", ["--version"], { encoding: "utf8" });
  return (probe.error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT";
}

/** True when an executable can be spawned at all (not ENOENT). */
function executableAvailable(cmd: string): boolean {
  const probe = spawnSync(cmd, ["-version"], { encoding: "utf8" });
  return (probe.error as NodeJS.ErrnoException | undefined)?.code !== "ENOENT";
}

const GROK_SESSIONS_DIR = join(homedir(), ".grok", "sessions");

/**
 * Newest `.mp4` under `~/.grok/sessions/**\/videos/`, modified at or after
 * `sinceMs` — Grok saves a clip under its own session directory keyed by the
 * URL-encoded cwd and a session id, never the cwd itself (proven in the
 * captain's real test, `data/kcanim/report.md`), so finding it means scanning
 * rather than knowing the path up front.
 */
function findNewestSessionVideo(sinceMs: number): string | undefined {
  if (!existsSync(GROK_SESSIONS_DIR)) return undefined;
  let newest: { path: string; mtimeMs: number } | undefined;
  for (const cwdDir of readdirSync(GROK_SESSIONS_DIR, { withFileTypes: true })) {
    if (!cwdDir.isDirectory()) continue;
    const cwdPath = join(GROK_SESSIONS_DIR, cwdDir.name);
    for (const sessionDir of readdirSync(cwdPath, { withFileTypes: true })) {
      if (!sessionDir.isDirectory()) continue;
      const videosDir = join(cwdPath, sessionDir.name, "videos");
      if (!existsSync(videosDir)) continue;
      for (const file of readdirSync(videosDir, { withFileTypes: true })) {
        if (!file.isFile() || !file.name.endsWith(".mp4")) continue;
        const path = join(videosDir, file.name);
        const mtimeMs = statSync(path).mtimeMs;
        if (mtimeMs < sinceMs) continue;
        if (!newest || mtimeMs > newest.mtimeMs) newest = { path, mtimeMs };
      }
    }
  }
  return newest?.path;
}

/** Real `grok -p` invocation for `image_to_video`, wrapped so `auto-video.ts` stays spawn-free and testable. */
function runGrokVideoHeadless(prompt: string, timeoutMs: number): GrokVideoRunResult {
  const since = Date.now() - 5000; // slack for clock/mtime granularity
  const result = spawnSync("grok", ["-p", prompt, "--output-format", "json", "--always-approve"], {
    timeout: timeoutMs,
    encoding: "utf8",
  });
  if ((result.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT") return { ok: false, timedOut: true };
  if (result.error) return { ok: false, timedOut: false, error: result.error.message };
  if (result.signal) return { ok: false, timedOut: false, error: `grok killed by ${result.signal}` };
  if (result.status !== 0) {
    const output = (result.stderr || result.stdout || "").trim();
    return {
      ok: false,
      timedOut: false,
      error: `grok exited with status ${result.status}${output ? `: ${output}` : ""}`,
    };
  }
  const mp4Path = findNewestSessionVideo(since);
  if (!mp4Path) return { ok: false, timedOut: false, error: "grok did not save a video" };
  return { ok: true, timedOut: false, mp4Path };
}

/**
 * Real ffmpeg + img2webp conversion — the proven recipe from the captain's
 * real test (`data/kcanim/report.md`): a seamless bounce loop (forward, then
 * reversed with the first reversed frame dropped) at 2x speed, 384x384,
 * 10fps, lossy WebP q50, infinite loop. Homebrew ffmpeg has no libwebp
 * encoder, so ffmpeg only extracts frames and `img2webp` (`brew install
 * webp`) encodes them — both local tools, neither calls a network.
 */
function runFfmpegConvert(mp4Path: string, outPath: string): ConvertResult {
  if (!executableAvailable("ffmpeg")) {
    return { ok: false, error: "ffmpeg is not on PATH — install it with `brew install ffmpeg`" };
  }
  if (!executableAvailable("img2webp")) {
    return { ok: false, error: "img2webp is not on PATH — install it with `brew install webp`" };
  }

  const workDir = mkdtempSync(join(tmpdir(), "kcanim-convert-"));
  try {
    const framesDir = join(workDir, "frames");
    mkdirSync(framesDir, { recursive: true });

    const ffmpeg = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        mp4Path,
        "-filter_complex",
        "[0:v]setpts=PTS/2.0,fps=10,scale=384:384,split[a][b];" +
          "[b]reverse,trim=start_frame=1,setpts=PTS-STARTPTS[r];[a][r]concat=n=2:v=1",
        join(framesDir, "f%03d.png"),
      ],
      { encoding: "utf8" },
    );
    if (ffmpeg.error) return { ok: false, error: ffmpeg.error.message };
    if (ffmpeg.status !== 0) {
      return { ok: false, error: `ffmpeg exited with status ${ffmpeg.status}: ${ffmpeg.stderr?.trim()}` };
    }

    const frames = readdirSync(framesDir)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((f) => join(framesDir, f));
    if (frames.length === 0) return { ok: false, error: "ffmpeg produced no frames" };

    const img2webp = spawnSync(
      "img2webp",
      ["-loop", "0", "-d", "100", "-lossy", "-q", "50", ...frames, "-o", outPath],
      { encoding: "utf8" },
    );
    if (img2webp.error) return { ok: false, error: img2webp.error.message };
    if (img2webp.status !== 0) {
      return { ok: false, error: `img2webp exited with status ${img2webp.status}: ${img2webp.stderr?.trim()}` };
    }
    return { ok: true };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

/** `--auto`: same plan/naming/resume logic as the clipboard walk, but drives `grok` headless per card. */
async function runAutoWalk(themeName: string, entries: readonly ManualBriefEntry[]): Promise<number> {
  if (!grokCliAvailable()) {
    console.error(`⛔ The grok CLI is not on PATH. Install and sign in to Grok Build, or run without --auto.`);
    return 1;
  }
  mkdirSync(DROP_DIR, { recursive: true });
  console.log(
    `${entries.length} card(s) in "${themeName}". Auto mode — driving the grok CLI, one card at a time.\n` +
      `Drop folder: ${DROP_DIR}\n`,
  );

  let generated = 0;
  let skipped = 0;
  const failures: AutoCardFailure[] = [];

  for (const [i, entry] of entries.entries()) {
    const already = findDropFile(entry.prompt, listDropFileNames());
    if (already.kind === "one") {
      console.log(`[${i + 1}/${entries.length}] ${entry.card} — already dropped (${already.fileName}), skipping.`);
      skipped++;
      continue;
    }
    if (already.kind === "many") {
      console.log(
        `[${i + 1}/${entries.length}] ${entry.card} — ${already.fileNames.length} drop files already match this prompt (${already.fileNames.join(", ")}). Leave exactly one; skipping for now.`,
      );
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${entries.length}] ${entry.card} — generating…`);
    const result = runAutoCard(entry, { dropDir: DROP_DIR, runner: runGrokHeadless });
    if (isAutoCardFailure(result)) {
      console.log(`  ⛔ ${entry.card} — ${result.reason}`);
      failures.push(result);
    } else {
      console.log(`  Saved → ${join(DROP_DIR, result.fileName)}`);
      generated++;
    }
  }

  console.log(
    `\n${generated} generated this run, ${skipped} already dropped, ${failures.length} failed, ${entries.length} card(s) total.`,
  );
  if (failures.length > 0) {
    console.log(`Failed cards:`);
    for (const f of failures) console.log(`  - ${f.card}: ${f.reason}`);
  }
  return runNextSteps(themeName);
}

/**
 * `--auto-video`: animates every legendary card's already-approved still —
 * the manual animation lane (`data/kcanim/report.md`). A card the drop
 * folder already has a matching animation for (by prompt hash, same rule
 * `findAnimatedDropFile` uses for import) is skipped — reruns resume. A
 * legendary card with no resolved provider yet — the still's own bake-off
 * was never judged — is reported, never guessed at.
 */
async function runAutoVideoWalk(
  themeName: string,
  entries: ReturnType<typeof planLegendaryVideoEntries>["entries"],
  unresolved: readonly string[],
): Promise<number> {
  if (!grokCliAvailable()) {
    console.error(`⛔ The grok CLI is not on PATH. Install and sign in to Grok Build.`);
    return 1;
  }
  if (!executableAvailable("ffmpeg") || !executableAvailable("img2webp")) {
    console.error(
      `⛔ ffmpeg and/or img2webp are not on PATH. Install both:\n` +
        `   brew install ffmpeg webp\n` +
        `   (Homebrew ffmpeg has no libwebp encoder — ffmpeg only extracts frames, img2webp encodes.)`,
    );
    return 1;
  }

  mkdirSync(ANIMATED_DROP_DIR_ABS, { recursive: true });
  console.log(
    `${entries.length} legendary card(s) with an approved still in "${themeName}". ` +
      `Driving the grok CLI's image_to_video, one card at a time.\n` +
      `Drop folder: ${ANIMATED_DROP_DIR_ABS}\n`,
  );
  if (unresolved.length > 0) {
    console.log(
      `${unresolved.length} legendary card(s) have no provider chosen yet, so there is no still to ` +
        `animate — run \`pnpm seed --review\` and pick one first: ${unresolved.join(", ")}\n`,
    );
  }

  let generated = 0;
  let skipped = 0;
  const failures: AutoVideoFailure[] = [];

  for (const [i, entry] of entries.entries()) {
    const dropNames = existsSync(ANIMATED_DROP_DIR_ABS)
      ? readdirSync(ANIMATED_DROP_DIR_ABS, { withFileTypes: true })
          .filter((e) => e.isFile())
          .map((e) => e.name)
      : [];
    if (dropNames.includes(entry.fileName)) {
      console.log(`[${i + 1}/${entries.length}] ${entry.card} — already dropped (${entry.fileName}), skipping.`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${entries.length}] ${entry.card} — generating…`);
    const result = runAutoVideoCard(entry, {
      reviewDir: REVIEW_DIR,
      dropDir: ANIMATED_DROP_DIR_ABS,
      runner: runGrokVideoHeadless,
      converter: runFfmpegConvert,
    });
    if (isAutoVideoFailure(result)) {
      console.log(`  ⛔ ${entry.card} — ${result.reason}`);
      failures.push(result);
    } else {
      console.log(`  Saved → ${join(ANIMATED_DROP_DIR_ABS, result.fileName)}`);
      generated++;
    }
  }

  console.log(
    `\n${generated} generated this run, ${skipped} already dropped, ${failures.length} failed, ${entries.length} card(s) total.`,
  );
  if (failures.length > 0) {
    console.log(`Failed cards:`);
    for (const f of failures) console.log(`  - ${f.card}: ${f.reason}`);
  }
  return runNextSteps(themeName);
}

function runNextSteps(themeName: string): number {
  console.log(`\nImporting into the bake-off…`);
  const review = spawnSync("pnpm", ["seed", "--review", "--providers=supergrok-manual"], {
    stdio: "inherit",
  });
  if (review.status !== 0) {
    console.error(
      `⛔ "pnpm seed --review --providers=supergrok-manual" failed (status ${review.status}); not building the contact sheet.`,
    );
    return 1;
  }
  console.log(`Building the comparison sheet…`);
  const sheet = spawnSync("pnpm", ["contact-sheet", themeName], { stdio: "inherit" });
  return sheet.status ?? 1;
}

async function main(): Promise<number> {
  let args;
  try {
    args = parseSupergrokArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof SupergrokArgsError) {
      console.error(`⛔ ${err.message}`);
      return 1;
    }
    throw err;
  }
  const themeName = args.themeName;

  const seed = loadSeed(SEED_PATH);

  if (args.autoVideo) {
    let plan;
    try {
      plan = planLegendaryVideoEntries(seed, themeName);
    } catch (err) {
      if (err instanceof ThemeNotFoundError) {
        console.error(`⛔ ${err.message}`);
        return 1;
      }
      throw err;
    }
    if (plan.entries.length === 0 && plan.unresolved.length === 0) {
      console.log(`"${themeName}" has no legendary cards. Nothing to do.`);
      return 0;
    }
    return runAutoVideoWalk(themeName, plan.entries, plan.unresolved);
  }

  let entries;
  try {
    entries = planThemeEntries(seed, themeName);
  } catch (err) {
    if (err instanceof ThemeNotFoundError) {
      console.error(`⛔ ${err.message}`);
      return 1;
    }
    throw err;
  }

  if (entries.length === 0) {
    console.log(`"${themeName}" has no cards. Nothing to do.`);
    return 0;
  }

  if (args.auto) {
    return runAutoWalk(themeName, entries);
  }

  mkdirSync(DROP_DIR, { recursive: true });
  console.log(
    `${entries.length} card(s) in "${themeName}".\n` +
      `Drop folder: ${DROP_DIR}\n` +
      `Watching: ${DOWNLOADS_DIR}\n`,
  );

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let dropped = 0;
  let skipped = 0;
  let quit = false;

  try {
    for (const [i, entry] of entries.entries()) {
      if (quit) break;

      const already = findDropFile(entry.prompt, listDropFileNames());
      if (already.kind === "one") {
        console.log(`[${i + 1}/${entries.length}] ${entry.card} — already dropped (${already.fileName}), skipping.`);
        continue;
      }
      if (already.kind === "many") {
        console.log(
          `[${i + 1}/${entries.length}] ${entry.card} — ${already.fileNames.length} drop files already match this prompt (${already.fileNames.join(", ")}). Leave exactly one; skipping for now.`,
        );
        continue;
      }

      console.log(`\n[${i + 1}/${entries.length}] ${entry.card}`);
      cardLoop: while (true) {
        const since = Date.now() - 5000; // slack for clock/poll granularity
        copyToClipboard(entry.prompt);
        console.log(`Prompt copied. Paste it into Grok and save the picture to ${DOWNLOADS_DIR}.`);
        const answer = await ask(rl, `Press Enter once saved, or type "skip" / "redo" / "quit": `);
        if (answer === "quit") {
          quit = true;
          break cardLoop;
        }
        if (answer === "skip") {
          skipped++;
          break cardLoop;
        }
        if (answer === "redo") {
          continue cardLoop;
        }
        console.log(`Watching for a new image…`);
        const fileName = await waitForNewImage(since, WAIT_TIMEOUT_MS);
        if (!fileName) {
          console.log(
            `No new image seen in ${DOWNLOADS_DIR} within ${Math.round(WAIT_TIMEOUT_MS / 60000)} minutes.`,
          );
          continue cardLoop;
        }
        const dest = destFileName(entry, fileName);
        renameSync(join(DOWNLOADS_DIR, fileName), join(DROP_DIR, dest));
        console.log(`Saved → ${join(DROP_DIR, dest)}`);
        dropped++;
        break cardLoop;
      }
    }
  } finally {
    rl.close();
  }

  if (quit) console.log(`\nStopped early.`);
  console.log(`${dropped} dropped this run, ${skipped} skipped, ${entries.length} card(s) total.`);
  return runNextSteps(themeName);
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
