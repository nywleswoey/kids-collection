/**
 * Generate a theme's art through both providers, then render an advisory
 * judge table — runbook Step 6/7's "both lanes at once" shortcut (see
 * `seed-content/NEW-THEME-RUNBOOK.md` and AGENTS.md).
 *
 *   pnpm theme-images "<Theme Name>"
 *
 * Runs both existing lanes concurrently rather than reimplementing either:
 *
 *   - the Grok lane:       pnpm supergrok "<Theme Name>" --auto
 *   - the Cloudflare lane: pnpm seed --review --themes="<Theme Name>" --providers=cloudflare-sdxl
 *
 * Both already have their own resume/skip behaviour (a card already dropped
 * or already reviewed is skipped) and their own per-card failure reporting,
 * which this command inherits unchanged. One lane failing is reported and
 * does not stop or skip the other (`lanes.ts`'s `runLanes`).
 *
 * Then, for every card in the theme, it looks at whichever candidates landed
 * in `seed-content/review/` from either provider and — for a card with more
 * than one — asks the local `claude` CLI, headless, to pick between them
 * (`src/shared/pool/judge.ts`). The verdict is cached by the candidates'
 * content hashes in `seed-content/review/<theme-slug>-judge-cache.json`, so a
 * re-run never re-judges a pair it has already seen. A card with one usable
 * candidate gets that one with no judge call; a card the `claude` CLI could
 * not judge (not on PATH, a failed or timed-out call) is reported and left
 * unjudged, never guessed at.
 *
 * Finally it writes `seed-content/review/<theme-slug>-images-review.html`:
 * one row per card, both providers' candidates side by side, the judge's pick
 * badged with its reason. Advisory only — nothing here writes to
 * `seed-content/cards.json` and nothing publishes. Step 8's human pick stays
 * the only thing `--sync` reads.
 *
 * No API key, no SDK, anywhere in this command: the Grok lane drives the
 * signed-in `grok` CLI, the Cloudflare lane calls Cloudflare Workers AI with
 * its existing key, and the judge step drives the signed-in `claude` CLI.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { loadSeed } from "@/shared/pool/loader";
import { PROVIDERS } from "@/shared/pool/providers";
import { slug } from "@/shared/pool/keys";
import { parseJudgeCache, serializeJudgeCache, type JudgeCache } from "@/shared/pool/judge";
import { renderJudgeTable } from "@/shared/pool/judge-table";
import { parseThemeImagesArgs, ThemeImagesArgsError } from "./args";
import { runLanes, type LaneOutcome, type LaneSpec } from "./lanes";
import { claudeCliAvailable, judgeRunner } from "./judge-runner";
import { judgeTheme } from "./judge-theme";

const SEED_PATH = join(process.cwd(), "seed-content", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed-content", "review");

/** Runs a command to completion, inheriting stdio, without throwing on a non-zero exit. */
function runCommand(id: string, command: string, args: readonly string[]): Promise<LaneOutcome> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], { stdio: "inherit" });
    child.on("error", (err) => {
      resolve({ id, ok: false, detail: err.message });
    });
    child.on("close", (code) => {
      resolve({
        id,
        ok: code === 0,
        detail: code === 0 ? "ok" : `exited with status ${code}`,
      });
    });
  });
}

function grokLane(themeName: string): LaneSpec {
  return {
    id: "grok (supergrok --auto)",
    run: () => runCommand("grok (supergrok --auto)", "pnpm", ["supergrok", themeName, "--auto"]),
  };
}

function cloudflareLane(themeName: string): LaneSpec {
  return {
    id: "cloudflare-sdxl (seed --review)",
    run: () =>
      runCommand("cloudflare-sdxl (seed --review)", "pnpm", [
        "seed",
        "--review",
        `--themes=${themeName}`,
        "--providers=cloudflare-sdxl",
      ]),
  };
}

function judgeCacheFile(themeName: string): string {
  return join(REVIEW_DIR, `${slug(themeName)}-judge-cache.json`);
}

function loadJudgeCache(path: string): JudgeCache {
  if (!existsSync(path)) return {};
  return parseJudgeCache(readFileSync(path, "utf8"));
}

async function main(): Promise<number> {
  let args;
  try {
    args = parseThemeImagesArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof ThemeImagesArgsError) {
      console.error(`⛔ ${err.message}`);
      return 1;
    }
    throw err;
  }
  const { themeName } = args;

  const seed = loadSeed(SEED_PATH);
  const theme = seed.themes.find((t) => t.name === themeName);
  if (!theme) {
    console.error(
      `⛔ No theme named "${themeName}" in seed-content/cards.json.\n` +
        `   Themes: ${seed.themes.map((t) => t.name).join(", ")}`,
    );
    return 1;
  }

  mkdirSync(REVIEW_DIR, { recursive: true });

  console.log(`Generating "${themeName}" through both lanes (concurrently)…\n`);
  const outcomes = await runLanes([grokLane(themeName), cloudflareLane(themeName)]);
  for (const o of outcomes) {
    console.log(`${o.ok ? "✓" : "⛔"} ${o.id}: ${o.detail}`);
  }
  const failed = outcomes.filter((o) => !o.ok);
  if (failed.length > 0) {
    console.warn(
      `\n⚠️  ${failed.length} lane(s) failed — continuing to judge whatever candidates are on disk.`,
    );
  }

  console.log(`\nJudging candidates…`);
  const available = claudeCliAvailable();
  if (!available) {
    console.warn(`⚠️  the claude CLI is not on PATH — every multi-candidate card will be reported as unjudged.`);
  }

  const cachePath = judgeCacheFile(themeName);
  const cache = loadJudgeCache(cachePath);
  const rows = judgeTheme(
    theme,
    PROVIDERS,
    REVIEW_DIR,
    join,
    { exists: existsSync, read: (p) => new Uint8Array(readFileSync(p)) },
    cache,
    available ? judgeRunner : undefined,
  );
  writeFileSync(cachePath, serializeJudgeCache(cache));

  const judged = rows.filter((r) => r.outcome.status === "judged").length;
  const cached = rows.filter((r) => r.outcome.status === "cached").length;
  const single = rows.filter((r) => r.outcome.status === "single").length;
  const unjudged = rows.filter((r) => r.outcome.status === "unjudged");
  const missing = rows.filter((r) => r.outcome.status === "missing").length;
  console.log(
    `${judged} judged, ${cached} from cache, ${single} with only one candidate, ` +
      `${unjudged.length} unjudged, ${missing} with no candidate (of ${rows.length} card(s)).`,
  );
  if (unjudged.length > 0) {
    console.log(`Unjudged:`);
    for (const r of unjudged) {
      console.log(`  - ${r.name}: ${r.outcome.status === "unjudged" ? r.outcome.reason : ""}`);
    }
  }

  const outPath = join(REVIEW_DIR, `${slug(themeName)}-images-review.html`);
  writeFileSync(outPath, renderJudgeTable({ theme: themeName, rows }));
  console.log(`\n→ ${outPath}`);

  return failed.length > 0 ? 1 : 0;
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
