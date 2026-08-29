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
  /**
   * The theme's own cover art (#122) — what fronts its tile in the binder's
   * category picker, and the thumbnail on the place bar inside it.
   *
   * The picker used to borrow the child's rarest owned card. That is a trophy,
   * not a landmark: it changes on a legendary pull, and a category the child has
   * not started showed a neutral placeholder — so the newest theme, the one they
   * most want to find, was the least recognisable thing on the screen.
   *
   * Nullable for one migration only. Every theme is required to have one and
   * `seed --sync` refuses to publish a theme whose cover has no reviewed image;
   * the column tightens to NOT NULL once the 16 pre-existing themes are filled.
   */
  coverUrl: text("cover_url"),
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

/**
 * Children — per-family profiles. New child starts with 3 pull tokens (BR4).
 *
 * Rows are SOFT-deleted (#97): removing a profile stamps `archivedAt` rather than
 * issuing a DELETE, because a DELETE cascades into `collections`,
 * `quiz_completions`, `quiz_seen_questions` and `collection_rewards` — every card
 * the child has ever pulled. The cascades below are unchanged and still pinned
 * (BR14, `tests-pg/delete-path.pg.test.ts`); no application path reaches them any
 * more. Data-preservation plan: `docs/DATA-PRESERVATION-0009.md`.
 */
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
    // Soft-delete stamp (#97). NULL = active, which is why the column is nullable
    // rather than a boolean with a default: "when was this archived" is the fact a
    // parent needs when deciding whether to undo, and NULL is the only value the
    // pre-migration rows could honestly have.
    archivedAt: timestamp("archived_at", { withTimezone: true }),
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

/**
 * Admin gate WebAuthn credentials (parent-gate-auth). The first auth-related
 * persistence in this schema — everything else here is game state.
 *
 * One row per enrolled passkey. `parentId` is the Google `sub` already copied
 * into the session by `auth/config.ts`: "there is only one parent" is true today
 * and cheap not to depend on.
 *
 * `counter` is the WebAuthn signature counter. It is STORED BUT NOT ENFORCED:
 * synced-passkey providers (1Password, iCloud Keychain, Google Password Manager)
 * always report 0, so the anti-cloning check is inert for this setup and
 * enforcing it would break the intended flow. Kept for a future device-bound
 * authenticator. See `Product-Definition/features/parent-gate-auth/`.
 */
export const adminCredentials = pgTable(
  "admin_credentials",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    /** Google account `sub` of the owning parent. */
    parentId: text("parent_id").notNull(),
    /** base64url credential id as returned by the authenticator. */
    credentialId: text("credential_id").notNull(),
    /** base64url COSE public key. */
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    /** Comma-joined AuthenticatorTransport hints ("internal,hybrid"); may be "". */
    transports: text("transports").notNull().default(""),
    /** Human label shown in the admin list, e.g. "1Password". */
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("admin_credentials_credential_id_idx").on(t.credentialId),
    index("admin_credentials_parent_idx").on(t.parentId),
  ],
);

export type ThemeRow = typeof themes.$inferSelect;
export type CardRow = typeof cards.$inferSelect;
export type ChildRow = typeof children.$inferSelect;
export type CollectionRow = typeof collections.$inferSelect;
export type QuizCompletionRow = typeof quizCompletions.$inferSelect;
export type QuizSeenQuestionRow = typeof quizSeenQuestions.$inferSelect;
export type CollectionRewardRow = typeof collectionRewards.$inferSelect;
export type AdminCredentialRow = typeof adminCredentials.$inferSelect;
