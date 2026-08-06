/**
 * Restore-drill assertion (Inc23 FR13). Compares per-table row counts taken from
 * production against the same counts read back from the restored copy.
 *
 *   tsx scripts/backup/verify.ts <prod-counts.tsv> <restored-counts.tsv>
 *
 * Exits non-zero on ANY difference — a dump that cannot be restored faithfully
 * must fail the run that produced it. There is no tolerance window: a false
 * failure is visible and re-runnable, a silently weakened assertion is not.
 *
 * Handles no credentials and touches no database, so nothing it prints can leak
 * a connection string into a public Actions log.
 */
import { readFileSync } from "node:fs";
import {
  parseCounts,
  diffCounts,
  isClean,
  formatDiff,
} from "@/features/backup/count-report";

function main(): void {
  const [beforePath, afterPath] = process.argv.slice(2);
  if (!beforePath || !afterPath) {
    console.error("usage: tsx scripts/backup/verify.ts <prod-counts> <restored-counts>");
    process.exit(2);
  }

  const before = parseCounts(readFileSync(beforePath, "utf8"));
  const after = parseCounts(readFileSync(afterPath, "utf8"));

  if (before.length === 0) {
    console.error("Restore drill FAILED — no production counts were captured.");
    process.exit(1);
  }

  const diff = diffCounts(before, after);
  console.log(formatDiff(diff));

  if (!isClean(diff)) process.exit(1);

  const total = after.reduce((n, c) => n + c.rows, 0);
  console.log(`  ${after.length} tables, ${total} rows verified.`);
}

main();
