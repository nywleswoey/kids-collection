/**
 * `--check-urls`: standalone, network-only, DB-free. Runs and exits (FR11).
 * Deliberately not coupled to a publish: it is safe to run at any point during
 * authoring, and a publish should not fail for a reason unrelated to publishing.
 */
import { checkSourceUrls } from "@/seed/url-check";
import type { SeedFile } from "@/seed/seed-schema";
import type { SeedDeps } from "../deps";

export async function checkUrls(deps: SeedDeps, seed: SeedFile): Promise<number> {
  const total = seed.themes.reduce((n, t) => n + t.cards.length, 0);
  deps.log(`Checking ${total} sourceUrl(s)…`);
  const failures = await checkSourceUrls(seed);
  if (failures.length === 0) {
    deps.log(`✓ all ${total} sourceUrl(s) returned 200.`);
    return 0;
  }
  deps.error(`\n⛔ ${failures.length} of ${total} sourceUrl(s) failed:\n`);
  for (const f of failures) {
    deps.error(`   [${f.status}] ${f.theme} / ${f.card}\n        ${f.url}`);
  }
  return 1;
}
