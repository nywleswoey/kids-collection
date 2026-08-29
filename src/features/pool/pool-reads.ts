/**
 * Read-only pool queries used by the offline seed CLI (Inc24).
 *
 * Separated from `publish-plan.ts` and `completeness.ts` because those are pure
 * and must stay testable without a database — importing the `db` singleton into
 * them pulls in `env.databaseUrl` at module load, which fails in Vitest. Same
 * split as Inc23's `backup/count-report.ts` (pure) vs `scripts/backup/verify.ts`.
 *
 * Every query here is strictly a read. `--review` calls the first one and writes
 * nothing at all — which is why none of them uses `upsertTheme`, whose lookup
 * would have inserted a row.
 *
 * `readPublishedImages` is the odd one out and says so: it serves `--check-images`
 * (#78), which audits art already in the pool rather than planning anything.
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

/**
 * Theme names that already have a cover published (#122).
 *
 * The cover equivalent of `listPublishedCardKeys`, and read the same way and for
 * the same reason: `--review` needs to know which covers to generate and the
 * publish guard needs to know which to demand, and the two must agree. A theme
 * that does not exist yet contributes nothing, so its cover falls into the plan
 * alongside all 30 of its cards.
 *
 * Keyed by NAME, not id, because that is what the seed file has and what
 * `--review` can use without writing a theme row to find out.
 */
export async function listPublishedCoverThemes(): Promise<Set<string>> {
  const rows = await db
    .select({ theme: themes.name, cover: themes.coverUrl })
    .from(themes);
  return new Set(rows.filter((r) => r.cover !== null).map((r) => r.theme));
}

/**
 * Every published card's art, as `(theme, card, imageUrl)` in display order.
 *
 * Read-only, and the only consumer is `--check-images` (#78): a published card's
 * bytes are never looked at again by any other seed path.
 */
export async function readPublishedImages(): Promise<
  Array<{ theme: string; card: string; url: string }>
> {
  const rows = await db
    .select({ theme: themes.name, card: cards.name, url: cards.imageUrl })
    .from(cards)
    .innerJoin(themes, eq(themes.id, cards.themeId))
    .orderBy(themes.sortOrder, cards.name);
  return rows.map((r) => ({ theme: r.theme, card: r.card, url: r.url }));
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
