/**
 * Build the review contact sheet for one theme — runbook Step 7, CHECKPOINT 2.
 *
 *   pnpm contact-sheet "Ocean Machines"
 *
 * Writes seed/review/<theme-slug>-review.html: one row per subject, one column
 * per registered provider, the `--sync` pick outlined (#63's subject x provider
 * grid). A local scratch artifact — do not commit it.
 *
 * This replaces the inline `node -e` block the runbook used to carry, which
 * #67's filenames broke silently: it filtered for `.jpg` (dropping every
 * Cloudflare PNG candidate) and took the first match per card (rendering one
 * candidate where a bake-off has N). It reported neither, so the sheet looked
 * complete while showing a single provider.
 *
 * Reads only. No database, no network, no credentials.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadSeed } from "@/features/pool/loader";
import { slug } from "@/features/pool/keys";
import { planContactSheet, renderContactSheet } from "@/features/pool/contact-sheet";
import { PROVIDERS } from "@/features/pool/providers";

const SEED_PATH = join(process.cwd(), "seed", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed", "review");

function main() {
  const themeName = process.argv[2];
  if (!themeName) {
    console.error(
      `Usage: pnpm contact-sheet "<Theme Name>"\n` +
        `   The name must match seed/cards.json exactly.`,
    );
    process.exitCode = 1;
    return;
  }

  const seed = loadSeed(SEED_PATH);
  const theme = seed.themes.find((t) => t.name === themeName);
  if (!theme) {
    console.error(
      `⛔ No theme named "${themeName}" in seed/cards.json.\n` +
        `   Themes: ${seed.themes.map((t) => t.name).join(", ")}`,
    );
    process.exitCode = 1;
    return;
  }

  if (!existsSync(REVIEW_DIR)) {
    console.error(`⛔ ${REVIEW_DIR} does not exist. Run \`pnpm seed --review\` first.`);
    process.exitCode = 1;
    return;
  }
  const files = readdirSync(REVIEW_DIR);

  // Every REGISTERED provider gets a column, including one with no candidates at
  // all — an empty column is the loud version of a lane that never ran, where
  // omitting it would look like a bake-off that was never meant to include it.
  const sheet = planContactSheet(
    theme,
    PROVIDERS,
    {
      exists: (f) => existsSync(join(REVIEW_DIR, f)),
      readSidecar: (f) => {
        try {
          return JSON.parse(readFileSync(join(REVIEW_DIR, f), "utf8")) as { model?: string };
        } catch {
          return undefined;
        }
      },
      listFiles: () => files,
    },
    // The other themes, so a theme whose slug prefixes another's does not report
    // that other theme's candidates as its own orphans.
    seed.themes.filter((t) => t.name !== theme.name).map((t) => t.name),
  );

  const out = join(REVIEW_DIR, `${slug(theme.name)}-review.html`);
  writeFileSync(out, renderContactSheet(sheet));

  const cells = sheet.rows.length * sheet.providerIds.length;
  console.log(
    `→ ${out}\n` +
      `   ${sheet.rows.length} card(s) x ${sheet.providerIds.length} provider(s) ` +
      `= ${cells} cell(s), ${cells - sheet.missing} with an image.`,
  );
  if (sheet.missing > 0) {
    console.warn(
      `⚠️  ${sheet.missing} cell(s) have no candidate on disk — a blank cell means that\n` +
        `   provider produced nothing for that card, NOT that it drew badly. Every card\n` +
        `   in the theme gets a row, including ones already published, which \`--review\`\n` +
        `   does not generate; this script reads no database and cannot tell them apart.`,
    );
  }
  if (sheet.unpicked > 0) {
    console.warn(
      `⚠️  ${sheet.unpicked} card(s) have no provider chosen. \`--sync\` will refuse\n` +
        `   them until a \`provider\` is set on the card or on the theme.`,
    );
  }
  if (sheet.orphans.length > 0) {
    console.warn(
      `⚠️  ${sheet.orphans.length} file(s) belong to no registered provider:\n` +
        sheet.orphans.map((f) => `   ${f}`).join("\n"),
    );
  }
}

main();
