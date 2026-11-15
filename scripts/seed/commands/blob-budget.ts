/**
 * `--blob-budget`: weigh the whole store against the plan's allowance and say
 * how many more themes fit, per lane (#79). Standalone; runs and exits.
 *
 * Standalone rather than in-band on --sync, which is the opposite of
 * `comparePoolShape`'s choice and for the opposite reason. A short theme is a
 * fault of the run that just happened, so it has to be caught inside it. Store
 * pressure is a slow trend across many runs, and wiring it into --sync would
 * add a `list()` to every publish and give a publish a new way to fail for a
 * reason that has nothing to do with the cards being published. The runbook
 * calls this before a bake-off instead, which is the moment the answer can
 * still change what you do.
 *
 * Reads the STORE, not the pool: `put()` adds a random suffix, so a re-publish
 * strands the old object and the pool's own URLs cannot see it. Read-only —
 * stranded bytes are reported and never deleted.
 */
import {
  buildBlobBudget,
  formatBytes,
  readStoreObjects,
  WARN_FRACTION,
  type BlobBudget,
} from "@/seed/blob-budget";
import { PROVIDERS } from "@/seed/providers";
import { CARDS_PER_THEME } from "@/seed/seed-schema";
import type { SeedDeps } from "../deps";

export async function blobBudget(deps: SeedDeps): Promise<number> {
  deps.log(`Weighing the Blob store…`);
  const [objects, published] = await Promise.all([
    readStoreObjects(),
    deps.readPublishedImages(),
  ]);
  const budget = buildBlobBudget({
    objects,
    liveUrls: new Set(
      published.flatMap((p) => (p.animatedUrl ? [p.url, p.animatedUrl] : [p.url])),
    ),
    lanes: PROVIDERS,
  });
  return reportBlobBudget(budget, published.length) ? 1 : 0;
}

/**
 * Print a store budget (#79). Returns true when the run should exit non-zero,
 * which is how the runbook's Hard stop is detectable from a script.
 */
function reportBlobBudget(budget: BlobBudget, publishedCount: number): boolean {
  const pct = (budget.usedFraction * 100).toFixed(1);
  console.log(
    `\n   stored     ${formatBytes(budget.store.totalBytes)} of ` +
      `${formatBytes(budget.ceilingBytes)}  (${pct}%)\n` +
      `   objects    ${budget.store.count}  for ${publishedCount} published card(s)\n` +
      `   per card   mean ${formatBytes(budget.store.meanBytes)}, ` +
      `median ${formatBytes(budget.store.medianBytes)}, ` +
      `max ${formatBytes(budget.store.maxBytes)}\n` +
      `   free       ${formatBytes(budget.freeBytes)}`,
  );

  if (budget.orphans.count > 0) {
    console.log(
      `\n   ${budget.orphans.count} object(s), ${formatBytes(budget.orphans.bytes)}, that no ` +
        `published card points at.\n` +
        `   Re-publishing a card writes a NEW object rather than replacing the old\n` +
        `   one, and the allowance is charged for both. Reported, not deleted: look\n` +
        `   before removing anything, because a card whose row was pruned and whose\n` +
        `   bytes were kept looks exactly the same from here.`,
    );
  }

  console.log(`\n   Themes of ${CARDS_PER_THEME} cards that still fit, per lane:`);
  for (const p of budget.projections) {
    const weight = p.perCardBytes === null ? "UNMEASURED" : `${formatBytes(p.perCardBytes)}/card`;
    console.log(`     ${p.id.padEnd(18)} ${weight.padEnd(16)} ${p.themes ?? "—"}`);
  }
  // Said every run, not only when it warns: this covers Blob storage and
  // nothing else, and the meter nearest its cap when #79 measured was one it
  // cannot see. A report silently scoped to one meter is how the others get
  // assumed instead of measured.
  console.log(
    `\n   Storage only. Image transformations are a deployment meter with no read\n` +
      `   path from here (2,998 of 5,000 per 30 days on 2026-08-15, the tightest of\n` +
      `   them) — check the team's usage page for that one. The ceiling above is the\n` +
      `   Hobby allowance, hardcoded; on a different plan it is wrong.`,
  );

  if (budget.overWarnLine) {
    console.warn(
      `\n⚠️  past ${(WARN_FRACTION * 100).toFixed(0)}% of the storage allowance.\n` +
        `   Exceeding it does not produce a bill on the Hobby plan — it cuts off access\n` +
        `   to the store until the 30-day window rolls, so cards whose optimized variant\n` +
        `   is not already cached render as their alt text. Publish nothing further\n` +
        `   until this is dealt with.`,
    );
    return true;
  }
  return false;
}
