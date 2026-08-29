/**
 * Build the review contact sheet for one theme — runbook Step 7, CHECKPOINT 2.
 *
 *   pnpm contact-sheet "Ocean Machines"
 *   pnpm contact-sheet --covers        # every theme's cover, one page (#122)
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
import type { SeedFile } from "@/features/pool/seed-schema";
import { slug } from "@/features/pool/keys";
import {
  planContactSheet,
  planCoverSheet,
  renderContactSheet,
} from "@/features/pool/contact-sheet";
import { parseSidecar } from "@/features/pool/review-files";
import { PROVIDERS } from "@/features/pool/providers";

const SEED_PATH = join(process.cwd(), "seed", "cards.json");
const REVIEW_DIR = join(process.cwd(), "seed", "review");

function main() {
  const themeName = process.argv[2];
  if (!themeName) {
    console.error(
      `Usage: pnpm contact-sheet "<Theme Name>"\n` +
        `       pnpm contact-sheet --covers\n` +
        `   The name must match seed/cards.json exactly.`,
    );
    process.exitCode = 1;
    return;
  }

  const seed = loadSeed(SEED_PATH);

  if (themeName === "--covers") {
    coversSheet(seed.themes);
    return;
  }

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
      // Through the same reader `--sync` uses for #75's durable record, so a
      // sidecar this grid labels a cell from is one the publish path would
      // accept — and neither renders nor records a shape the other rejects.
      readSidecar: (f) => {
        try {
          return parseSidecar(readFileSync(join(REVIEW_DIR, f), "utf8"));
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

/**
 * Every theme's cover on ONE page (#122).
 *
 * The per-theme sheet is right for a new theme and wrong for backfilling covers
 * onto themes that already shipped: it renders 30 blank rows for published cards
 * and buries the row that matters. This is also the only view that answers the
 * question the covers actually have to pass — whether they read as N DIFFERENT
 * places. A cover judged alone can look fine and still be the third grassy
 * hilltop in the grid.
 */
function coversSheet(themes: SeedFile["themes"]): void {
  if (!existsSync(REVIEW_DIR)) {
    console.error(`⛔ ${REVIEW_DIR} does not exist. Run \`pnpm seed --review\` first.`);
    process.exitCode = 1;
    return;
  }

  const sheet = planCoverSheet(themes, PROVIDERS, {
    exists: (f) => existsSync(join(REVIEW_DIR, f)),
    readSidecar: (f) => {
      try {
        return parseSidecar(readFileSync(join(REVIEW_DIR, f), "utf8"));
      } catch {
        return undefined;
      }
    },
    listFiles: () => readdirSync(REVIEW_DIR),
  });

  const out = join(REVIEW_DIR, "covers-review.html");
  writeFileSync(out, renderContactSheet(sheet));

  // Counted from the cells themselves, not as `cells - missing`. `missing`
  // deliberately excludes an escape hatch's blanks (#71), so subtracting it
  // reports every hatch column as full — 48 of 48 where 32 have an image.
  const cells = sheet.rows.length * sheet.providerIds.length;
  const present = sheet.rows.reduce(
    (n, r) => n + r.candidates.filter((c) => c.present).length,
    0,
  );
  console.log(
    `→ ${out}\n` +
      `   ${sheet.rows.length} cover(s) x ${sheet.providerIds.length} provider(s) ` +
      `= ${cells} cell(s), ${present} with an image.`,
  );
  if (sheet.unpicked > 0) {
    console.warn(
      `⚠️  ${sheet.unpicked} theme(s) have no provider chosen. \`--sync\` will refuse\n` +
        `   their covers until a \`provider\` is set on the theme — no cover, no publish.`,
    );
  }
}

main();
