import { neon } from "@neondatabase/serverless";
import type { ChildSeed } from "@/db/stores/child-store.fake";
import type { CollectionSeed } from "@/db/stores/collection-store.fake";
import type { QuizSeedRow } from "@/db/stores/quiz-store.fake";

/** Raw seeding client (neonConfig is set by setup.ts before this evaluates). */
const sql = neon(process.env.DATABASE_URL!);

const BALANCE_COLUMNS = [
  "pullTokens",
  "epicTickets",
  "luckyTickets",
  "commonPickTickets",
  "rarePickTickets",
  "epicPickTickets",
  "legendaryPickTickets",
] as const;

/** Wipe every table so each makeStore() call yields a fresh, isolated store. */
export async function resetAll(): Promise<void> {
  await sql`TRUNCATE collections, collection_rewards, quiz_completions, children, cards, themes RESTART IDENTITY CASCADE`;
}

/** Insert children with all seven balance columns set explicitly (0 unless the
 *  seed overrides), so absent columns read as 0 rather than the table default. */
export async function seedChildren(seed: ChildSeed): Promise<void> {
  for (const [id, cols] of Object.entries(seed)) {
    const v = BALANCE_COLUMNS.map((c) => cols[c] ?? 0);
    await sql`INSERT INTO children
      (id, name, avatar, pull_tokens, epic_tickets, lucky_tickets,
       common_pick_tickets, rare_pick_tickets, epic_pick_tickets, legendary_pick_tickets)
      VALUES (${id}, 'test', '🙂', ${v[0]}, ${v[1]}, ${v[2]}, ${v[3]}, ${v[4]}, ${v[5]}, ${v[6]})`;
  }
}

/** Ensure the given theme ids exist (collection_rewards FK target). */
export async function seedThemes(ids: string[]): Promise<void> {
  for (const id of ids) {
    await sql`INSERT INTO themes (id, name) VALUES (${id}, ${id}) ON CONFLICT DO NOTHING`;
  }
}

/** Ensure a default theme + the given card ids exist (collections FK targets). */
export async function seedCards(ids: string[]): Promise<void> {
  await sql`INSERT INTO themes (id, name) VALUES ('t1', 'T') ON CONFLICT DO NOTHING`;
  for (const id of ids) {
    await sql`INSERT INTO cards (id, theme_id, name, rarity, image_url, edu_text)
      VALUES (${id}, 't1', ${id}, 'common'::rarity, '', '') ON CONFLICT DO NOTHING`;
  }
}

export async function seedQuizCompletions(rows: QuizSeedRow[]): Promise<void> {
  for (const r of rows) {
    await sql`INSERT INTO quiz_completions (child_id, topic, correct, total, passed, awarded, created_at)
      VALUES (${r.childId}, ${r.topic}, ${r.correct ?? 0}, ${r.total ?? 0},
              ${r.passed ?? false}, ${r.awarded}, ${r.createdAt.toISOString()})`;
  }
}

export async function seedCollections(seed: CollectionSeed): Promise<void> {
  for (const [childId, cards] of Object.entries(seed)) {
    for (const [cardId, count] of Object.entries(cards)) {
      await sql`INSERT INTO collections (child_id, card_id, count) VALUES (${childId}, ${cardId}, ${count})`;
    }
  }
}
