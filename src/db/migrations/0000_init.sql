-- U1 Foundation & Data — initial schema
-- Can be regenerated with `npm run db:generate`; applied with `npm run db:migrate`.

CREATE TYPE "rarity" AS ENUM ('common', 'rare', 'epic', 'legendary');

CREATE TABLE "themes" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  CONSTRAINT "themes_name_unique" UNIQUE("name")
);

CREATE TABLE "cards" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "theme_id" text NOT NULL,
  "name" text NOT NULL,
  "rarity" "rarity" NOT NULL,
  "image_url" text NOT NULL,
  "edu_text" text NOT NULL,
  CONSTRAINT "cards_theme_id_themes_id_fk"
    FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE cascade
);
CREATE INDEX "cards_theme_idx" ON "cards" ("theme_id");

CREATE TABLE "children" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "avatar" text NOT NULL,
  "pull_tokens" integer DEFAULT 3 NOT NULL,
  CONSTRAINT "pull_tokens_non_negative" CHECK ("pull_tokens" >= 0)
);

CREATE TABLE "collections" (
  "child_id" text NOT NULL,
  "card_id" text NOT NULL,
  "count" integer DEFAULT 1 NOT NULL,
  CONSTRAINT "collections_child_id_card_id_pk" PRIMARY KEY ("child_id", "card_id"),
  CONSTRAINT "count_at_least_one" CHECK ("count" >= 1),
  CONSTRAINT "collections_child_id_children_id_fk"
    FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE cascade,
  CONSTRAINT "collections_card_id_cards_id_fk"
    FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX "collections_child_card_idx" ON "collections" ("child_id", "card_id");
CREATE INDEX "collections_child_idx" ON "collections" ("child_id");
