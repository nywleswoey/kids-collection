import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  parseCounts,
  diffCounts,
  isClean,
  formatDiff,
  type TableCount,
} from "@/features/backup/count-report";

const tableArb = fc.record({
  schema: fc.constantFrom("public", "drizzle"),
  table: fc.stringMatching(/^[a-z][a-z0-9_]{0,14}$/),
  rows: fc.integer({ min: 0, max: 100_000 }),
});

/** A report with unique schema.table keys, as psql would produce. */
const reportArb = fc
  .array(tableArb, { minLength: 1, maxLength: 12 })
  .map((cs) => {
    const seen = new Set<string>();
    return cs.filter((c) => {
      const k = `${c.schema}.${c.table}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  })
  .filter((cs) => cs.length > 0);

const toTsv = (cs: TableCount[]) =>
  cs.map((c) => `${c.schema}\t${c.table}\t${c.rows}`).join("\n");

describe("count-report — the restore drill's assertion", () => {
  it("round-trips psql output", () => {
    fc.assert(
      fc.property(reportArb, (cs) => {
        expect(parseCounts(toTsv(cs))).toEqual(cs);
      }),
    );
  });

  it("tolerates blank lines and the psql row-count footer", () => {
    const parsed = parseCounts("public\tcards\t300\n\npublic\tthemes\t10\n(2 rows)\n");
    expect(parsed).toEqual([
      { schema: "public", table: "cards", rows: 300 },
      { schema: "public", table: "themes", rows: 10 },
    ]);
  });

  it("throws on a malformed line rather than skipping it", () => {
    // A silently dropped line would weaken the comparison invisibly.
    expect(() => parseCounts("public\tcards")).toThrow(/malformed/);
    expect(() => parseCounts("public\tcards\tmany")).toThrow(/bad row count/);
    expect(() => parseCounts("public\tcards\t-1")).toThrow(/bad row count/);
  });

  it("reports a report identical to itself as clean", () => {
    fc.assert(
      fc.property(reportArb, (cs) => {
        const d = diffCounts(cs, cs);
        expect(isClean(d)).toBe(true);
        expect(formatDiff(d)).toMatch(/verified/);
      }),
    );
  });

  it("catches any row-count difference, however small", () => {
    fc.assert(
      fc.property(
        reportArb,
        fc.nat(),
        fc.integer({ min: 1, max: 1000 }),
        (cs, idxSeed, delta) => {
          const i = idxSeed % cs.length;
          const after = cs.map((c, j) => (j === i ? { ...c, rows: c.rows + delta } : c));
          const d = diffCounts(cs, after);
          expect(isClean(d)).toBe(false);
          expect(d.rowMismatches).toHaveLength(1);
          expect(d.rowMismatches[0].table).toBe(`${cs[i].schema}.${cs[i].table}`);
        },
      ),
    );
  });

  it("catches a table missing from the restore — even when it holds zero rows", () => {
    // The case row counts alone cannot see: an empty table absent from the dump
    // looks identical to an empty table present in it.
    const before: TableCount[] = [
      { schema: "public", table: "collections", rows: 637 },
      { schema: "drizzle", table: "__drizzle_migrations", rows: 0 },
    ];
    const after = before.slice(0, 1);
    const d = diffCounts(before, after);
    expect(isClean(d)).toBe(false);
    expect(d.missingTables).toEqual(["drizzle.__drizzle_migrations"]);
    expect(formatDiff(d)).toMatch(/missing from the restore/);
  });

  it("catches a table that only exists in the restore", () => {
    fc.assert(
      fc.property(reportArb, (cs) => {
        const extra = { schema: "public", table: "ghost_table_x", rows: 1 };
        const d = diffCounts(cs, [...cs, extra]);
        expect(d.extraTables).toEqual(["public.ghost_table_x"]);
        expect(isClean(d)).toBe(false);
      }),
    );
  });

  it("an empty restore of a non-empty production never passes", () => {
    fc.assert(
      fc.property(reportArb, (cs) => {
        expect(isClean(diffCounts(cs, []))).toBe(false);
      }),
    );
  });

  it("formats a failure without inventing a pass", () => {
    const d = diffCounts(
      [{ schema: "public", table: "collections", rows: 637 }],
      [{ schema: "public", table: "collections", rows: 12 }],
    );
    expect(formatDiff(d)).toContain("production 637, restored 12");
    expect(formatDiff(d)).toMatch(/FAILED/);
  });
});
