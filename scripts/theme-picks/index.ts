/**
 * Writes Step 8's bake-off picks into `seed-content/cards.json` for one
 * theme, so the human never hand-edits that file (see
 * `docs/NEW-THEME-RUNBOOK.md` Step 8 and AGENTS.md).
 *
 *   pnpm theme-picks "<Theme Name>" [--use "<Card Name>=<provider>"]...
 *
 * By default every card's pick is `pnpm theme-images`'s judge recommendation:
 * this reuses that command's `judgeTheme` (`scripts/theme-images/judge-
 * theme.ts`) unchanged, consulting its cache
 * (`seed-content/review/<theme-slug>-judge-cache.json`) and the candidates
 * already on disk — it never invokes the `claude` CLI itself, so a card that
 * cache doesn't already cover stays `unjudged`/`missing` rather than being
 * judged on the spot. `--use "<Card Name>=<provider>"` (repeatable)
 * overrides any card by name; `<provider>` is a registered id or a short
 * alias (`src/shared/pool/theme-picks.ts`'s `resolveProviderAlias`).
 *
 * A card with no judged recommendation and no override refuses the whole
 * run, by name, before anything is written (`deriveThemePicks`). The theme's
 * majority provider and the sparse per-card override list are then written
 * with `applyThemePicks` (`src/shared/pool/cards-json-edit.ts`), which edits
 * only those `provider` fields and reproduces every other byte of the file
 * unchanged. Re-running is idempotent and replaces this theme's previous
 * picks (an override from an earlier run that's no longer in the new set is
 * cleared, not left stale).
 *
 * Never publishes, never runs `--sync`, and touches no field but `provider`
 * — Step 9 stays a separate, manual `pnpm seed --sync`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSeed } from "@/shared/pool/loader";
import { PROVIDERS, PROVIDER_IDS } from "@/shared/pool/providers";
import { slug } from "@/shared/pool/keys";
import { parseJudgeCache, type JudgeCache } from "@/shared/pool/judge";
import { applyThemePicks } from "@/shared/pool/cards-json-edit";
import {
  deriveThemePicks,
  resolveProviderAlias,
  ThemePicksError,
  type CardRecommendation,
} from "@/shared/pool/theme-picks";
import { judgeTheme } from "../theme-images/judge-theme";
import { parseThemePicksArgs, ThemePicksArgsError } from "./args";

const SEED_PATH = join(process.cwd(), "seed-content", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed-content", "review");

function main(): number {
  let args;
  try {
    args = parseThemePicksArgs(process.argv.slice(2));
  } catch (err) {
    if (err instanceof ThemePicksArgsError) {
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

  const cachePath = join(REVIEW_DIR, `${slug(themeName)}-judge-cache.json`);
  const cache: JudgeCache = existsSync(cachePath) ? parseJudgeCache(readFileSync(cachePath, "utf8")) : {};

  const rows = judgeTheme(
    theme,
    PROVIDERS,
    REVIEW_DIR,
    join,
    { exists: existsSync, read: (p) => new Uint8Array(readFileSync(p)) },
    cache,
    undefined, // cache/disk only — never spawns the `claude` CLI
  );

  const recommendations = new Map<string, CardRecommendation>(
    rows.map((r) => [
      r.name,
      {
        providerId:
          r.outcome.status === "unjudged" || r.outcome.status === "missing" ? undefined : r.outcome.winner,
      },
    ]),
  );

  const overrides = new Map<string, string>();
  for (const { cardName, providerRaw } of args.uses) {
    overrides.set(cardName, resolveProviderAlias(providerRaw, PROVIDER_IDS));
  }

  let result;
  try {
    result = deriveThemePicks({
      cardNames: theme.cards.map((c) => c.name),
      recommendations,
      overrides,
      providerIds: PROVIDER_IDS,
    });
  } catch (err) {
    if (err instanceof ThemePicksError) {
      console.error(`⛔ ${err.message}`);
      return 1;
    }
    throw err;
  }

  const rawText = readFileSync(SEED_PATH, "utf8");
  const updated = applyThemePicks(rawText, themeName, result);
  writeFileSync(SEED_PATH, updated);

  const overrideNames = Object.keys(result.cardOverrides);
  console.log(`Recorded "${themeName}" picks in seed-content/cards.json:`);
  console.log(`  theme provider: ${result.themeProvider}`);
  if (overrideNames.length > 0) {
    console.log(`  per-card overrides (${overrideNames.length}):`);
    for (const name of overrideNames) {
      console.log(`    - ${name}: ${result.cardOverrides[name]}`);
    }
  } else {
    console.log(`  per-card overrides: none`);
  }
  console.log(
    `  ${result.counts.total} card(s) total, ${result.counts.fromOverride} from --use, ` +
      `${result.counts.total - result.counts.fromOverride} from the judge.`,
  );
  console.log(`\nNothing published. Review the diff, commit, then run Step 9 ("pnpm seed --sync") when ready.`);
  return 0;
}

process.exitCode = main();
