import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  diffMigrations,
  expectedMigrations,
  formatMigrationDiff,
  gatePasses,
  migrationHash,
  parseMigrationRows,
  type ExpectedMigration,
  type JournalEntry,
} from "../scripts/backup/migration-report";

const journalArb = fc
  .array(
    fc.record({
      tag: fc.stringMatching(/^[0-9]{4}_[a-z]{1,10}$/),
      when: fc.integer({ min: 1, max: 2_000_000_000_000 }),
    }),
    { minLength: 1, maxLength: 12 },
  )
  // A real journal has unique tags and unique (strictly increasing) `when`s;
  // the gate keys on `when`, so duplicates would be an impossible input.
  .map((entries) => {
    const seenTags = new Set<string>();
    const seenWhens = new Set<number>();
    return entries.filter((e) => {
      if (seenTags.has(e.tag) || seenWhens.has(e.when)) return false;
      seenTags.add(e.tag);
      seenWhens.add(e.when);
      return true;
    });
  })
  .filter((entries) => entries.length > 0);

function expectedFor(entries: JournalEntry[]): ExpectedMigration[] {
  const fileContents = new Map(entries.map((e) => [e.tag, `-- sql for ${e.tag}`]));
  return expectedMigrations({ entries }, fileContents);
}

describe("migration-report — the migration gate's assertion (#104, F1)", () => {
  it("hashes identical content identically and different content differently", () => {
    expect(migrationHash("select 1;")).toBe(migrationHash("select 1;"));
    expect(migrationHash("select 1;")).not.toBe(migrationHash("select 2;"));
  });

  it("throws when a journal tag has no matching file content, rather than silently skipping it", () => {
    expect(() =>
      expectedMigrations({ entries: [{ tag: "0000_x", when: 1 }] }, new Map()),
    ).toThrow(/no file content/);
  });

  it("production that ran exactly the registered migrations is clean", () => {
    fc.assert(
      fc.property(journalArb, (entries) => {
        const expected = expectedFor(entries);
        const actual = expected.map((e) => ({ hash: e.hash, createdAt: e.when }));
        const d = diffMigrations(expected, actual);
        expect(d).toEqual({ missing: [], hashMismatch: [], unexpected: [] });
        expect(gatePasses(d)).toBe(true);
        expect(formatMigrationDiff(d)).toMatch(/verified/);
      }),
    );
  });

  it("catches a registered migration production never ran", () => {
    fc.assert(
      fc.property(journalArb, fc.nat(), (entries, idxSeed) => {
        const expected = expectedFor(entries);
        const i = idxSeed % expected.length;
        const actual = expected
          .filter((_, j) => j !== i)
          .map((e) => ({ hash: e.hash, createdAt: e.when }));
        const d = diffMigrations(expected, actual);
        expect(gatePasses(d)).toBe(false);
        expect(d.missing).toEqual([expected[i]]);
        expect(formatMigrationDiff(d)).toMatch(/FAILED/);
        expect(formatMigrationDiff(d)).toContain(expected[i].tag);
      }),
    );
  });

  it("only warns when production applied a registered migration under a different hash", () => {
    fc.assert(
      fc.property(journalArb, fc.nat(), (entries, idxSeed) => {
        const expected = expectedFor(entries);
        const i = idxSeed % expected.length;
        const actual = expected.map((e, j) =>
          j === i ? { hash: "edited", createdAt: e.when } : { hash: e.hash, createdAt: e.when },
        );
        const d = diffMigrations(expected, actual);
        expect(gatePasses(d)).toBe(true);
        expect(d.missing).toEqual([]);
        expect(d.hashMismatch).toEqual([expected[i]]);
        expect(d.unexpected).toEqual([]);
        expect(formatMigrationDiff(d)).toMatch(/verified/);
        expect(formatMigrationDiff(d)).toContain(`warning: ${expected[i].tag}`);
      }),
    );
  });

  it("only warns on a production row that matches no journal entry", () => {
    fc.assert(
      fc.property(journalArb, (entries) => {
        const expected = expectedFor(entries);
        const extraAt = Math.max(...expected.map((e) => e.when)) + 1;
        const actual = [
          ...expected.map((e) => ({ hash: e.hash, createdAt: e.when })),
          { hash: "extra", createdAt: extraAt },
        ];
        const d = diffMigrations(expected, actual);
        expect(gatePasses(d)).toBe(true);
        expect(d.missing).toEqual([]);
        expect(d.hashMismatch).toEqual([]);
        expect(d.unexpected).toEqual([{ hash: "extra", createdAt: extraAt }]);
        expect(formatMigrationDiff(d)).toMatch(/verified/);
        expect(formatMigrationDiff(d)).toContain(`created_at=${extraAt}`);
      }),
    );
  });

  it("round-trips psql's hash<TAB>created_at output", () => {
    fc.assert(
      fc.property(journalArb, (entries) => {
        const expected = expectedFor(entries);
        const tsv = expected.map((e) => `${e.hash}\t${e.when}`).join("\n");
        expect(parseMigrationRows(tsv)).toEqual(
          expected.map((e) => ({ hash: e.hash, createdAt: e.when })),
        );
      }),
    );
  });

  it("tolerates blank lines and the psql row-count footer", () => {
    const parsed = parseMigrationRows("aaa\t111\n\nbbb\t222\n(2 rows)\n");
    expect(parsed).toEqual([
      { hash: "aaa", createdAt: 111 },
      { hash: "bbb", createdAt: 222 },
    ]);
  });

  it("throws on a malformed line rather than skipping it", () => {
    expect(() => parseMigrationRows("aaa")).toThrow(/malformed/);
    expect(() => parseMigrationRows("aaa\tnotanumber")).toThrow(/bad row/);
  });
});
