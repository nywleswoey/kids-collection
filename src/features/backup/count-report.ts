/**
 * Restore-drill verification (Inc23 FR13 / D5=A).
 *
 * `psql` produces the numbers; this compares them. Deliberately pure string and
 * array work with no database driver — a second query builder is on the parent's
 * prohibited list, and the assertion that guards the children's data should not
 * live in untested shell.
 *
 * Two assertions, because they fail for different reasons:
 *   1. Table-set equality  — catches a schema falling outside the dump, which is
 *      the exact drift the "no -t, no -n allowlist" rule exists to prevent. Row
 *      counts alone cannot tell "table missing from the dump" from "table
 *      legitimately empty".
 *   2. Exact row-count equality — catches a truncated or partial dump.
 */

export interface TableCount {
  schema: string;
  table: string;
  rows: number;
}

export interface CountDiff {
  /** Present in production, absent from the restored copy. */
  missingTables: string[];
  /** Present in the restored copy, absent from production. */
  extraTables: string[];
  rowMismatches: { table: string; before: number; after: number }[];
}

/** `schema.table` — the identity used for all comparisons. */
export function qualifiedName(c: TableCount): string {
  return `${c.schema}.${c.table}`;
}

/**
 * Parse tab-separated `schema<TAB>table<TAB>rows` lines, as emitted by psql in
 * unaligned tuples-only mode. Blank lines and psql's trailing row-count footer
 * are ignored; a malformed line is an error rather than a silent skip, because a
 * dropped line would weaken the comparison invisibly.
 */
export function parseCounts(tsv: string): TableCount[] {
  const out: TableCount[] = [];
  for (const raw of tsv.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (/^\(\d+ rows?\)$/.test(line)) continue; // psql footer
    const parts = line.split("\t").map((p) => p.trim());
    if (parts.length !== 3) {
      throw new Error(`count-report: malformed line: ${JSON.stringify(raw)}`);
    }
    const [schema, table, rowsRaw] = parts;
    const rows = Number(rowsRaw);
    if (!Number.isInteger(rows) || rows < 0) {
      throw new Error(`count-report: bad row count for ${schema}.${table}: ${rowsRaw}`);
    }
    out.push({ schema, table, rows });
  }
  return out;
}

/**
 * Compare production table counts against restored backup counts. Returns
 * tables missing, extras found, and row count mismatches.
 */
export function diffCounts(before: TableCount[], after: TableCount[]): CountDiff {
  const beforeMap = new Map(before.map((c) => [qualifiedName(c), c.rows]));
  const afterMap = new Map(after.map((c) => [qualifiedName(c), c.rows]));

  const missingTables = [...beforeMap.keys()].filter((t) => !afterMap.has(t)).sort();
  const extraTables = [...afterMap.keys()].filter((t) => !beforeMap.has(t)).sort();

  const rowMismatches = [...beforeMap.entries()]
    .filter(([t, n]) => afterMap.has(t) && afterMap.get(t) !== n)
    .map(([t, n]) => ({ table: t, before: n, after: afterMap.get(t)! }))
    .sort((a, b) => a.table.localeCompare(b.table));

  return { missingTables, extraTables, rowMismatches };
}

/** True if the diff shows no discrepancies (perfect restore match). */
export function isClean(d: CountDiff): boolean {
  return (
    d.missingTables.length === 0 &&
    d.extraTables.length === 0 &&
    d.rowMismatches.length === 0
  );
}

/** Human-readable failure report for the workflow log. Contains no credentials. */
export function formatDiff(d: CountDiff): string {
  if (isClean(d)) return "Restore verified: every table present, every row count exact.";
  const lines: string[] = ["Restore drill FAILED — the backup does not match production."];
  if (d.missingTables.length) {
    lines.push(`  Tables missing from the restore: ${d.missingTables.join(", ")}`);
  }
  if (d.extraTables.length) {
    lines.push(`  Unexpected tables in the restore: ${d.extraTables.join(", ")}`);
  }
  for (const m of d.rowMismatches) {
    lines.push(`  ${m.table}: production ${m.before}, restored ${m.after}`);
  }
  return lines.join("\n");
}
