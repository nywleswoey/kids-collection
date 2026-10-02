import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  diffMigrations,
  expectedMigrations,
  formatMigrationDiff,
  isClean,
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
  .map((entries) => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.tag)) return false;
      seen.add(e.tag);
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
        expect(isClean(d)).toBe(true);
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
        expect(isClean(d)).toBe(false);
        expect(d.missing).toEqual([expected[i]]);
        expect(formatMigrationDiff(d)).toContain(expected[i].tag);
      }),
    );
  });

  it("catches a row in production whose hash doesn't match the registered file — a changed/unregistered migration", () => {
    fc.assert(
      fc.property(journalArb, fc.nat(), (entries, idxSeed) => {
        const expected = expectedFor(entries);
        const i = idxSeed % expected.length;
        const actual = expected.map((e, j) =>
          j === i ? { hash: "tampered", createdAt: e.when } : { hash: e.hash, createdAt: e.when },
        );
        const d = diffMigrations(expected, actual);
        expect(isClean(d)).toBe(false);
        expect(d.missing).toEqual([expected[i]]);
        expect(d.unexpected).toEqual([{ hash: "tampered", createdAt: expected[i].when }]);
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
