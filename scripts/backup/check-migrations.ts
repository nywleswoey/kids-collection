/**
 * Migration gate (#104, F1).
 *
 *   node scripts/backup/check-migrations.ts <prod-migrations.tsv>
 *
 * `prod-migrations.tsv` is `hash<TAB>created_at` lines read from production's
 * `drizzle.__drizzle_migrations`, in the same unaligned tuples-only psql format
 * `backup.yml` already uses for the row-count drill. Exits non-zero when
 * production hasn't run every migration `src/db/migrations/meta/_journal.json`
 * registers; hash mismatches and extra rows are printed as warnings only — see
 * migration-report.ts for exactly what is compared.
 *
 * Imports only node:fs/path/url (plus migration-report.ts, same constraint) so
 * this runs under plain `node` with Node 24's built-in type stripping — no
 * `pnpm install` needed next to the backup job's production secret (F3).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  diffMigrations,
  expectedMigrations,
  formatMigrationDiff,
  gatePasses,
  parseMigrationRows,
} from "./migration-report.ts";

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../src/db/migrations");

function main(): void {
  const [prodRowsPath] = process.argv.slice(2);
  if (!prodRowsPath) {
    console.error("usage: node scripts/backup/check-migrations.ts <prod-migrations.tsv>");
    process.exit(2);
  }

  const journal = JSON.parse(
    readFileSync(join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8"),
  ) as { entries: { tag: string; when: number }[] };

  const fileContents = new Map(
    journal.entries.map((e) => [e.tag, readFileSync(join(MIGRATIONS_DIR, `${e.tag}.sql`), "utf8")]),
  );

  const expected = expectedMigrations(journal, fileContents);
  const actual = parseMigrationRows(readFileSync(prodRowsPath, "utf8"));
  const diff = diffMigrations(expected, actual);

  console.log(formatMigrationDiff(diff));
  if (!gatePasses(diff)) process.exit(1);

  console.log(`  ${expected.length} migration(s) verified against production.`);
}

main();
