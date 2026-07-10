CREATE TYPE "public"."rarity" AS ENUM('common', 'rare', 'epic', 'legendary');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cards" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" text NOT NULL,
	"name" text NOT NULL,
	"rarity" "rarity" NOT NULL,
	"image_url" text NOT NULL,
	"edu_text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "children" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"avatar" text NOT NULL,
	"pull_tokens" integer DEFAULT 3 NOT NULL,
	CONSTRAINT "pull_tokens_non_negative" CHECK ("children"."pull_tokens" >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collections" (
	"child_id" text NOT NULL,
	"card_id" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "collections_child_id_card_id_pk" PRIMARY KEY("child_id","card_id"),
	CONSTRAINT "count_at_least_one" CHECK ("collections"."count" >= 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "themes" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "themes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cards" ADD CONSTRAINT "cards_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collections" ADD CONSTRAINT "collections_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collections" ADD CONSTRAINT "collections_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cards_theme_idx" ON "cards" USING btree ("theme_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collections_child_card_idx" ON "collections" USING btree ("child_id","card_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collections_child_idx" ON "collections" USING btree ("child_id");