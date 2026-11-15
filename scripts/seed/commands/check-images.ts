/**
 * `--check-images`: weigh every PUBLISHED card's art and report anything too
 * sparse to be a picture (#78). Standalone; runs and exits.
 *
 * The seam refuses a blank frame at generation time, which protects everything
 * published from here on and nothing published before — a card already in the
 * pool is never re-generated and never re-audited. This is the only pass over
 * those bytes, so it is a command rather than a one-off script.
 *
 * Runs ahead of `loadSeed`, unlike --check-urls: this reads the DATABASE and
 * touches no seed data, so failing it on an unrelated authoring error in
 * cards.json would refuse to answer a question about the live pool for no reason.
 */
import { auditPublishedImages } from "@/seed/blank-audit";
import { CARD_SIZE } from "@/seed/providers";
import type { SeedDeps } from "../deps";

export async function checkImages(deps: SeedDeps): Promise<number> {
  const published = await deps.readPublishedImages();
  deps.log(`Weighing ${published.length} published card image(s)…`);
  const report = await auditPublishedImages(published, { size: CARD_SIZE });

  // Printed FIRST, because everything below is a statement about the images
  // that were actually weighed, and this says which ones were not.
  if (report.unreadable.length > 0) {
    deps.warn(`\n⚠️  ${report.unreadable.length} image(s) could not be weighed:\n`);
    for (const u of report.unreadable) {
      deps.warn(`   ${u.theme} / ${u.card} — ${u.reason}\n        ${u.url}`);
    }
    deps.warn(
      `\n   That is a fact about the request, NOT about the art. Nothing here needs\n` +
        `   republishing on this evidence — but nothing here has been cleared either.`,
    );
  }
  const weighed = report.checked - report.unreadable.length;
  if (report.suspects.length === 0) {
    // Never "all clear" over images nobody weighed — that is an all-clear
    // earned by not looking, which is the shape of the bug this issue is about.
    deps.log(`✓ no blank frames among the ${weighed} image(s) weighed (of ${report.checked}).`);
    return report.unreadable.length > 0 ? 1 : 0;
  }
  deps.error(
    `\n⛔ ${report.suspects.length} of ${weighed} weighed image(s) look blank:\n`,
  );
  for (const s of report.suspects) {
    deps.error(
      `   ${s.theme} / ${s.card} — ${s.byteLength} bytes ` +
        `(${s.bytesPerPixel.toFixed(4)} B/px)\n        ${s.url}`,
    );
  }
  deps.error(
    `\n   Look at each one before acting: this weighs bytes, it does not decode\n` +
      `   pixels. Republishing a card means removing it from the pool and running\n` +
      `   --review then --sync, which destroys its collection rows — read the\n` +
      `   blast-radius guard first.\n`,
  );
  return 1;
}
