/**
 * `--supergrok-export`: the manual lane's brief. Standalone; runs and exits.
 *
 * Same card set `--review` would draw (planned inserts), so the file the
 * owner works through cannot disagree with the bake-off. Reads the pool to
 * learn which cards are already published. Writes one markdown file into the
 * drop folder and does not generate, upload, or insert anything.
 *
 * `parseSeedArgs` already refuses --supergrok-export combined with --sync
 * (a conflicting-command-flags error) before this ever runs.
 */
import { join } from "node:path";
import {
  planManualBrief,
  renderManualBrief,
  SUPERGROK_BRIEF_NAME,
  SUPERGROK_DROP_DIR,
} from "@/seed/manual-brief";
import { planInserts, cardKey } from "@/seed/publish-plan";
import type { SeedFile } from "@/seed/seed-schema";
import { requireDatabaseUrl, type SeedDeps } from "../deps";

export async function supergrokExport(deps: SeedDeps, seed: SeedFile): Promise<number> {
  requireDatabaseUrl(deps, "`tsx --env-file=.env.local scripts/seed/index.ts --supergrok-export`");
  const published = await deps.listPublishedCardKeys();
  const planned = new Set(planInserts(seed, published).map((p) => cardKey(p.theme, p.card)));
  const entries = planManualBrief(seed.themes, planned);
  const dropDir = join(process.cwd(), SUPERGROK_DROP_DIR);
  deps.fs.mkdir(dropDir);
  const briefPath = join(dropDir, SUPERGROK_BRIEF_NAME);
  deps.fs.write(briefPath, renderManualBrief(entries));
  deps.log(
    `${entries.length} card(s) the bake-off would draw.\n` +
      `Brief: ${briefPath}\n` +
      `Save each picture into ${dropDir} under the name the brief gives, then:\n` +
      `  pnpm seed --review --providers=supergrok-manual`,
  );
  return 0;
}
