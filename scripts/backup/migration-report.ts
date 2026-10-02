/**
 * Did production run the migrations the deployed code needs? (#104, F1)
 *
 * Nothing before this read `drizzle.__drizzle_migrations` outside docs and
 * tests — `pg-gate` only replays migrations into an *empty* database, so it
 * can never catch prod sitting on an older schema. This compares the rows
 * drizzle-orm's migrator leaves in `__drizzle_migrations` (hash, created_at)
 * against `src/db/migrations/meta/_journal.json` and the `.sql` files it names.
 *
 * What fails: a journal entry whose `when` matches no row's `created_at` — a
 * migration production has not run. created_at/when is the key drizzle-orm's
 * migrator (`drizzle-orm/neon-http/migrator`) uses too, but it only compares
 * the newest row's created_at against each entry's `when`; checking every
 * entry here also catches a gap behind the newest row.
 *
 * What only warns: a row whose created_at matches an entry but whose hash
 * differs from the file's sha256 (the file was edited after it was applied),
 * and a row whose created_at matches no entry. drizzle's migrator ignores
 * both, so neither means prod is missing a migration.
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
  /** Journal entries with no production row whose created_at equals their `when`. Fails the gate. */
  missing: ExpectedMigration[];
  /** Journal entries applied in production under a different hash. Warning only. */
  hashMismatch: ExpectedMigration[];
  /** Rows in production whose created_at matches no journal entry. Warning only. */
  unexpected: MigrationRow[];
}

/** Compare the registered migrations against what production actually ran. */
export function diffMigrations(
  expected: ExpectedMigration[],
  actual: MigrationRow[],
): MigrationDiff {
  const hashesByCreatedAt = new Map<number, Set<string>>();
  for (const r of actual) {
    const hashes = hashesByCreatedAt.get(r.createdAt) ?? new Set<string>();
    hashes.add(r.hash);
    hashesByCreatedAt.set(r.createdAt, hashes);
  }
  const expectedWhens = new Set(expected.map((e) => e.when));

  const missing = expected.filter((e) => !hashesByCreatedAt.has(e.when));
  const hashMismatch = expected.filter((e) => {
    const hashes = hashesByCreatedAt.get(e.when);
    return hashes !== undefined && !hashes.has(e.hash);
  });
  const unexpected = actual.filter((r) => !expectedWhens.has(r.createdAt));

  return { missing, hashMismatch, unexpected };
}

/** True if production has a row for every registered migration. Warnings don't fail it. */
export function gatePasses(d: MigrationDiff): boolean {
  return d.missing.length === 0;
}

/** Human-readable report for the workflow log. Contains no credentials. */
export function formatMigrationDiff(d: MigrationDiff): string {
  const lines: string[] = gatePasses(d)
    ? ["Migration gate verified: production has run every registered migration."]
    : ["Migration gate FAILED — production has not run every migration in meta/_journal.json."];
  for (const m of d.missing) {
    lines.push(`  not applied in production: ${m.tag} (when=${m.when})`);
  }
  for (const m of d.hashMismatch) {
    lines.push(`  warning: ${m.tag} (when=${m.when}) applied in production with a different hash than its file`);
  }
  for (const r of d.unexpected) {
    lines.push(`  warning: row in production matches no journal entry: hash=${r.hash} created_at=${r.createdAt}`);
  }
  return lines.join("\n");
}
