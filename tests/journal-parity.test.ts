import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * `pg:up` (package.json) applies every `src/db/migrations/*.sql` through psql
 * in glob order. Production runs `drizzle-kit migrate`, which applies only the
 * entries listed in `meta/_journal.json` (F2). An unregistered `.sql` file
 * passes pg-gate but never runs in prod, and a journal `when` that is not
 * strictly increasing can apply migrations out of order. Pins both invariants
 * against the committed files rather than the pg-gate database, so drift is
 * caught without a database at all.
 */
const MIGRATIONS_DIR = join(process.cwd(), "src", "db", "migrations");

function sqlBasenames(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.replace(/\.sql$/, ""))
    .sort();
}

function journalEntries(): { idx: number; tag: string; when: number }[] {
  const raw = readFileSync(join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8");
  return JSON.parse(raw).entries;
}

describe("migration journal parity (F2)", () => {
  it("has one journal entry per .sql file, tagged with its basename", () => {
    const files = sqlBasenames();
    const tags = journalEntries()
      .map((e) => e.tag)
      .sort();
    expect(tags).toEqual(files);
  });

  it("orders entries by idx matching ascending tag order", () => {
    const entries = [...journalEntries()].sort((a, b) => a.idx - b.idx);
    const tags = entries.map((e) => e.tag);
    expect(tags).toEqual([...tags].sort());
  });

  it("has strictly increasing `when` timestamps in idx order", () => {
    const entries = [...journalEntries()].sort((a, b) => a.idx - b.idx);
    for (let i = 1; i < entries.length; i++) {
      expect(entries[i].when).toBeGreaterThan(entries[i - 1].when);
    }
  });
});
