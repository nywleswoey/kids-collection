/**
 * Offline collection reconciliation / audit CLI. NOT in the request path.
 *
 *   pnpm reconcile                 READ-ONLY: audit the live DB, print a report
 *   pnpm reconcile --fix           show the exact grants that would repair broken
 *                                  sets (still a dry run — writes nothing)
 *   pnpm reconcile --fix --yes     apply those grants (+1 each missing set card)
 *                                  — against a non-local DATABASE_URL, only after
 *                                  typing the grant count at a TTY prompt
 *
 * Requires DATABASE_URL in env (same as `pnpm seed`).
 *
 * ── Why this exists ──────────────────────────────────────────────────────────
 * A run of buggy `swapCards` implementations could commit a *lopsided* trade
 * (one side's decrement silently no-ops while the counterparty still receives),
 * which duplicates or drops a card. There is NO trade-history table, so a lost
 * card cannot be reconstructed from raw collection state alone — a missing card
 * just looks like one the child never had.
 *
 * But `collection_rewards` is a durable witness: a row for (child, theme, rarity)
 * PROVES the child once owned that *entire* rarity set (owning ≥1 of every card
 * of that rarity in the theme was the precondition for the reward). So if a child
 * holds a reward row for a set they no longer fully own, a card from that set
 * disappeared after the set was completed. That is the concrete, detectable
 * signal this tool reports.
 *
 * ARCHIVED CHILDREN ARE INCLUDED, on purpose (#97). Archiving hides a profile from
 * every parent- and child-facing read, but their `collections` rows still exist and
 * can still be broken; an auditor that inherited the app's visibility filter would
 * quietly stop auditing them. The same reasoning covers `previewReset` /
 * `perChildRows` in `src/shared/pool/blast-radius.ts`: a blast radius that
 * under-reported by a whole child would be worse than useless. Both are OFFLINE
 * tools reporting to an operator at a terminal, which is why neither inherits a
 * filter written for the app's screens.
 *
 * ── Honest caveat ────────────────────────────────────────────────────────────
 * A legitimate SACRIFICE burns copies and can delete a child's last copy of a
 * card — which produces the exact same "reward claimed but set now incomplete"
 * signature as a lost-card bug. The two are indistinguishable from state. So the
 * default is read-only reporting for human review; `--fix` re-grants missing set
 * cards only when you explicitly opt in, after reading the report and judging
 * whether a real loss (not a sacrifice) occurred.
 */
import { createInterface } from "node:readline/promises";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { isProductionDatabaseUrl, describeTarget } from "@/shared/pool/db-target";
import { findBrokenSets } from "./find-broken-sets";
import type { Card } from "@/lib/types";

const { cards, themes, children, collections, collectionRewards } = schema;

/**
 * Production guard for `--fix --yes` (mirrors `scripts/seed/guard.ts`'s
 * confirmDestructive): a write against a URL that isn't provably localhost
 * must come from a real terminal and name the exact grant count, so it can't
 * be triggered by a stale `.env.local` value or a piped `--yes`.
 */
async function confirmApply(databaseUrl: string | undefined, grantCount: number): Promise<void> {
  const isProduction = isProductionDatabaseUrl(databaseUrl);
  console.log(
    `\nTarget: ${isProduction ? "⚠️  PRODUCTION" : "local"} — ${describeTarget(databaseUrl)}`,
  );
  if (!isProduction) return;

  if (!process.stdin.isTTY) {
    throw new Error(
      "Aborted: not an interactive terminal. `reconcile --fix --yes` against production " +
        "requires a TTY confirmation — re-run this from a real terminal.",
    );
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(
      `Type the number of grants to apply (${grantCount}) to confirm writing to PRODUCTION: `,
    );
    if (answer.trim() !== String(grantCount)) {
      throw new Error("Aborted: confirmation did not match.");
    }
  } finally {
    rl.close();
  }
}

async function main() {
  const fix = process.argv.includes("--fix");
  const apply = fix && process.argv.includes("--yes");

  // ── Load everything once ───────────────────────────────────────────────────
  const [cardRows, themeRows, childRows, collectionRows, rewardRows] = await Promise.all([
    db.select().from(cards),
    db.select().from(themes),
    db.select().from(children),
    db.select().from(collections),
    db.select().from(collectionRewards),
  ]);

  const pool = cardRows as Card[];
  const cardById = new Map(pool.map((c) => [c.id, c]));
  const themeName = new Map(themeRows.map((t) => [t.id, t.name]));
  const childName = new Map(childRows.map((c) => [c.id, c.name]));

  // owned card-id set per child (count >= 1 rows only — count < 1 can't exist).
  const ownedByChild = new Map<string, Set<string>>();
  for (const r of collectionRows) {
    if (!ownedByChild.has(r.childId)) ownedByChild.set(r.childId, new Set());
    if (r.count >= 1) ownedByChild.get(r.childId)!.add(r.cardId);
  }

  // ── 1. Structural invariants (constraints should already prevent these) ─────
  const badCounts = collectionRows.filter((r) => r.count < 1);
  const orphanRows = collectionRows.filter(
    (r) => !childName.has(r.childId) || !cardById.has(r.cardId),
  );

  // ── 2. Reward-vs-holdings: completed sets the child no longer fully owns ─────
  const broken = findBrokenSets({ pool, rewardRows, ownedByChild, themeName, childName });

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log("── Collection reconciliation ─────────────────────────────────");
  console.log(
    `children=${childRows.length} cards=${cardRows.length} ` +
      `collection-rows=${collectionRows.length} reward-rows=${rewardRows.length}\n`,
  );

  console.log(`Structural: count<1 rows=${badCounts.length}, orphan rows=${orphanRows.length}`);
  for (const r of badCounts) console.log(`  ! count<1: child=${r.childId} card=${r.cardId} count=${r.count}`);
  for (const r of orphanRows) console.log(`  ! orphan: child=${r.childId} card=${r.cardId}`);
  console.log();

  if (broken.length === 0) {
    console.log("Set integrity: OK — every completed-set reward still holds its full set.");
  } else {
    const totalMissing = broken.reduce((n, b) => n + b.missing.length, 0);
    console.log(
      `Set integrity: ${broken.length} completed set(s) now incomplete — ` +
        `${totalMissing} missing card(s). Each is EITHER a lost-card bug OR a sacrifice:\n`,
    );
    for (const b of broken) {
      console.log(`  ${b.childName} — ${b.themeName} / ${b.rarity}:`);
      for (const m of b.missing) console.log(`      missing ${m.name} (${m.id})`);
    }
  }
  console.log();

  // ── Fix ──────────────────────────────────────────────────────────────────────
  if (!fix) {
    console.log("Read-only. Re-run with `--fix` to preview repairs, `--fix --yes` to apply.");
    return;
  }
  if (broken.length === 0) {
    console.log("Nothing to repair.");
    return;
  }

  const grants = broken.flatMap((b) => b.missing.map((m) => ({ childId: b.childId, cardId: m.id })));
  console.log(`${apply ? "Applying" : "Would apply"} ${grants.length} grant(s) (+1 each):`);
  for (const g of grants) console.log(`  grant child=${g.childId} card=${g.cardId}`);

  if (!apply) {
    console.log("\nDry run — nothing written. Add `--yes` to apply.");
    return;
  }

  await confirmApply(process.env.DATABASE_URL, grants.length);

  // Restore each missing set card: +1 on the (child, card) unique conflict.
  for (const g of grants) {
    await db
      .insert(collections)
      .values({ childId: g.childId, cardId: g.cardId, count: 1 })
      .onConflictDoUpdate({
        target: [collections.childId, collections.cardId],
        set: { count: sql`${collections.count} + 1` },
      });
  }
  console.log(`\nApplied ${grants.length} grant(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
