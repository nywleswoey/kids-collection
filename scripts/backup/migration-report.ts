/**
 * Did production run the migrations the deployed code needs? (#104, F1)
 *
 * Nothing before this read `drizzle.__drizzle_migrations` outside docs and
 * tests — `pg-gate` only replays migrations into an *empty* database, so it
 * can never catch prod sitting on an older schema. This compares the rows
 * drizzle-orm's own migrator leaves in `__drizzle_migrations` (hash,
 * created_at) against `src/db/migrations/meta/_journal.json` and the `.sql`
 * files it names — the exact inputs that migrator (`readMigrationFiles`,
 * `drizzle-orm/neon-http/migrator`) uses to decide what still needs to run,
 * so a mismatch here is the same signal the migrator itself would act on.
 *
 * Deliberately pure string/hash work with no database driver, mirroring
 * count-report.ts: the assertion that guards a missed-migration outage
 * should not live in untested shell.
 */
import { createHash } from "node:crypto";

export interface JournalEntry {
  tag: string;
  when: number;
}

export interface ExpectedMigration {
  tag: string;
  hash: string;
  when: number;
}

export interface MigrationRow {
  hash: string;
  createdAt: number;
}

/** sha256 hex of a migration file's raw content — matches drizzle-orm's migrator exactly. */
export function migrationHash(sqlContent: string): string {
  return createHash("sha256").update(sqlContent).digest("hex");
}

/** Journal entries + their file contents → the (hash, created_at) rows prod must hold. */
export function expectedMigrations(
  journal: { entries: JournalEntry[] },
  fileContents: ReadonlyMap<string, string>,
): ExpectedMigration[] {
  return journal.entries.map((e) => {
    const content = fileContents.get(e.tag);
    if (content === undefined) {
      throw new Error(`migration-report: no file content given for journal tag "${e.tag}"`);
    }
    return { tag: e.tag, hash: migrationHash(content), when: e.when };
  });
}

/**
 * Parse tab-separated `hash<TAB>created_at` lines, as emitted by psql in
 * unaligned tuples-only mode for `drizzle.__drizzle_migrations`.
 */
export function parseMigrationRows(tsv: string): MigrationRow[] {
  const out: MigrationRow[] = [];
  for (const raw of tsv.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\(\d+ rows?\)$/.test(line)) continue; // psql footer
    const parts = line.split("\t").map((p) => p.trim());
    if (parts.length !== 2) {
      throw new Error(`migration-report: malformed line: ${JSON.stringify(raw)}`);
    }
    const [hash, createdAtRaw] = parts;
    const createdAt = Number(createdAtRaw);
    if (!hash || !Number.isInteger(createdAt)) {
      throw new Error(`migration-report: bad row: ${JSON.stringify(raw)}`);
    }
    out.push({ hash, createdAt });
  }
  return out;
}

export interface MigrationDiff {
  /** Journal entries with no matching (hash, created_at) row in production. */
  missing: ExpectedMigration[];
  /** Rows in production that match no journal entry at all. */
  unexpected: MigrationRow[];
}

/** Compare the registered migrations against what production actually ran. */
export function diffMigrations(
  expected: ExpectedMigration[],
  actual: MigrationRow[],
): MigrationDiff {
  const actualKeys = new Set(actual.map((r) => `${r.hash}:${r.createdAt}`));
  const expectedKeys = new Set(expected.map((e) => `${e.hash}:${e.when}`));

  const missing = expected.filter((e) => !actualKeys.has(`${e.hash}:${e.when}`));
  const unexpected = actual.filter((r) => !expectedKeys.has(`${r.hash}:${r.createdAt}`));

  return { missing, unexpected };
}

/** True if the diff shows no discrepancies (production matches the journal exactly). */
export function isClean(d: MigrationDiff): boolean {
  return d.missing.length === 0 && d.unexpected.length === 0;
}

/** Human-readable failure report for the workflow log. Contains no credentials. */
export function formatMigrationDiff(d: MigrationDiff): string {
  if (isClean(d)) {
    return "Migration gate verified: production has run every registered migration.";
  }
  const lines: string[] = ["Migration gate FAILED — production does not match meta/_journal.json."];
  for (const m of d.missing) {
    lines.push(`  not applied in production: ${m.tag} (when=${m.when})`);
  }
  for (const r of d.unexpected) {
    lines.push(`  unexpected row in production: hash=${r.hash} created_at=${r.createdAt}`);
  }
  return lines.join("\n");
}
