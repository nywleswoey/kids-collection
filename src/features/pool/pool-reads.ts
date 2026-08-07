/**
 * Read-only pool queries used by the offline seed CLI (Inc24).
 *
 * Separated from `publish-plan.ts` and `completeness.ts` because those are pure
 * and must stay testable without a database — importing the `db` singleton into
 * them pulls in `env.databaseUrl` at module load, which fails in Vitest. Same
 * split as Inc23's `backup/count-report.ts` (pure) vs `scripts/backup/verify.ts`.
 *
 * Both queries are strictly reads. `--review` calls the first one and writes
 * nothing at all — which is why neither uses `upsertTheme`, whose lookup would
 * have inserted a row.
 */
import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { themes, cards } from "@/db/schema";
import type { Rarity } from "@/lib/types";
import { cardKey } from "./publish-plan";
import type { PublishedCount } from "./completeness";

/**
 * Every (theme, card) pair already published, as composite keys. One join.
 *
 * A theme that does not exist yet simply contributes nothing, so all of its cards
 * fall into the insert plan — no theme-id lookup needed, and no write.
 */
export async function listPublishedCardKeys(): Promise<Set<string>> {
  const rows = await db
    .select({ theme: themes.name, card: cards.name })
    .from(cards)
    .innerJoin(themes, eq(themes.id, cards.themeId));
  return new Set(rows.map((r) => cardKey(r.theme, r.card)));
}

/** Per-theme, per-rarity published counts. One grouped query. */
export async function readPublishedShape(): Promise<PublishedCount[]> {
  const rows = await db
    .select({ theme: themes.name, rarity: cards.rarity, n: count() })
    .from(cards)
    .innerJoin(themes, eq(themes.id, cards.themeId))
    .groupBy(themes.name, cards.rarity);
  return rows.map((r) => ({
    theme: r.theme,
    rarity: r.rarity as Rarity,
    n: Number(r.n),
  }));
}
