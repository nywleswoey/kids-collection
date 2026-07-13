CREATE TABLE IF NOT EXISTS "collection_rewards" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" text NOT NULL,
	"theme_id" text NOT NULL,
	"rarity" "rarity" NOT NULL,
	"card_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shown_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "common_pick_tickets" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "rare_pick_tickets" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "epic_pick_tickets" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "legendary_pick_tickets" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection_rewards" ADD CONSTRAINT "collection_rewards_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection_rewards" ADD CONSTRAINT "collection_rewards_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection_rewards" ADD CONSTRAINT "collection_rewards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "collection_rewards_child_theme_rarity_idx" ON "collection_rewards" USING btree ("child_id","theme_id","rarity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "collection_rewards_child_idx" ON "collection_rewards" USING btree ("child_id");--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "common_pick_tickets_non_negative" CHECK ("children"."common_pick_tickets" >= 0);--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "rare_pick_tickets_non_negative" CHECK ("children"."rare_pick_tickets" >= 0);--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "epic_pick_tickets_non_negative" CHECK ("children"."epic_pick_tickets" >= 0);--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "legendary_pick_tickets_non_negative" CHECK ("children"."legendary_pick_tickets" >= 0);