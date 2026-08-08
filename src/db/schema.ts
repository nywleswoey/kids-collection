import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Rarity tiers (BR3). */
export const rarityEnum = pgEnum("rarity", [
  "common",
  "rare",
  "epic",
  "legendary",
]);

/** Themes — shared pool grouping. */
export const themes = pgTable("themes", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  // Display order, lowest = oldest (Inc21 FR1). Written from the theme's
  // position in seed/cards.json, so a newly appended theme is the most recent.
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Cards — shared library. */
export const cards = pgTable(
  "cards",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    rarity: rarityEnum("rarity").notNull(),
    imageUrl: text("image_url").notNull(),
    eduText: text("edu_text").notNull(),
    // Admin-verifiable source for the card's fun fact / legend origin (U4-FR5).
    sourceUrl: text("source_url").notNull().default(""),
  },
  (t) => [index("cards_theme_idx").on(t.themeId)],
);

/** Children — per-family profiles. New child starts with 3 pull tokens (BR4). */
export const children = pgTable(
  "children",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    avatar: text("avatar").notNull(),
    pullTokens: integer("pull_tokens").notNull().default(3),
    // Unified Easter Egg tickets (Inc19): one balance replacing the old epic/lucky
    // egg tickets and the four rarity-pick tickets. Redeemed for a weighted-roll
    // pick-1-of-5. Backfilled by migration 0005 as the sum of the six old columns.
    easterEggTickets: integer("easter_egg_tickets").notNull().default(0),
  },
  (t) => [
    check("pull_tokens_non_negative", sql`${t.pullTokens} >= 0`), // BR5
    check("easter_egg_tickets_non_negative", sql`${t.easterEggTickets} >= 0`),
  ],
);

/** Collection — one row per (child, card); count = owned quantity (BR8/BR9). */
export const collections = pgTable(
  "collections",
  {
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }), // BR14
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    count: integer("count").notNull().default(1),
  },
  (t) => [
    primaryKey({ columns: [t.childId, t.cardId] }), // unique (childId, cardId)
    uniqueIndex("collections_child_card_idx").on(t.childId, t.cardId),
    index("collections_child_idx").on(t.childId),
    check("count_at_least_one", sql`${t.count} >= 1`), // BR9
  ],
);

/** Quiz completions (Inc11) — one row per attempt; powers daily caps + admin view. */
export const quizCompletions = pgTable(
  "quiz_completions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    correct: integer("correct").notNull(),
    total: integer("total").notNull(),
    passed: boolean("passed").notNull(),
    awarded: boolean("awarded").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("quiz_completions_child_created_idx").on(t.childId, t.createdAt)],
);

/**
 * Which GRAMMAR questions a child has already ANSWERED (Inc25 FR18) — rows are
 * written on submit, never when the offer is minted, so abandoning a quiz burns
 * nothing.
 *
 * `topic` is part of the key for two reasons: the exhaustion reset is then one
 * scoped DELETE, and question ids need only be unique WITHIN a bank rather than
 * across all six (they are unique globally today only by prefix convention).
 * Bounded by construction — 6 topics x ~50 questions x 3 children ~= 900 rows.
 * Maths is excluded on purpose: its ids are positional, so the same id names a
 * different question every attempt.
 */
export const quizSeenQuestions = pgTable(
  "quiz_seen_questions",
  {
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    questionId: text("question_id").notNull(),
    seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.childId, t.topic, t.questionId] })],
);

/**
 * Collection-completion rewards (Inc16 FR5). One row per rewarded
 * (child, theme, rarity) set — UNIQUE guarantees a set is rewarded exactly once
 * (dedup + race backstop). `shownAt` null = the celebratory modal is still pending.
 */
export const collectionRewards = pgTable(
  "collection_rewards",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    themeId: text("theme_id")
      .notNull()
      .references(() => themes.id, { onDelete: "cascade" }),
    rarity: rarityEnum("rarity").notNull(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    shownAt: timestamp("shown_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("collection_rewards_child_theme_rarity_idx").on(
      t.childId,
      t.themeId,
      t.rarity,
    ),
    index("collection_rewards_child_idx").on(t.childId),
  ],
);

export type ThemeRow = typeof themes.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type ChildRow = typeof children.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type QuizCompletionRow = typeof quizCompletions.$inferSelect;
export type QuizSeenQuestionRow = typeof quizSeenQuestions.$inferSelect;
export type CollectionRewardRow = typeof collectionRewards.$inferSelect;
