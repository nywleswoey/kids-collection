import {
  pgTable,
  pgEnum,
  text,
  integer,
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
  },
  (t) => [check("pull_tokens_non_negative", sql`${t.pullTokens} >= 0`)], // BR5
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

export type ThemeRow = typeof themes.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type ChildRow = typeof children.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
