-- Inc19: collapse the six special-ticket columns into one unified Easter Egg
-- ticket. Order matters: add the new column, backfill it as the sum of the six
-- old balances (1:1, no child loses tickets), then drop the old columns.
ALTER TABLE "children" ADD COLUMN "easter_egg_tickets" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "children" SET "easter_egg_tickets" =
  "epic_tickets" + "lucky_tickets" + "common_pick_tickets"
  + "rare_pick_tickets" + "epic_pick_tickets" + "legendary_pick_tickets";
--> statement-breakpoint
ALTER TABLE "children" DROP COLUMN "epic_tickets";--> statement-breakpoint
ALTER TABLE "children" DROP COLUMN "lucky_tickets";--> statement-breakpoint
ALTER TABLE "children" DROP COLUMN "common_pick_tickets";--> statement-breakpoint
ALTER TABLE "children" DROP COLUMN "rare_pick_tickets";--> statement-breakpoint
ALTER TABLE "children" DROP COLUMN "epic_pick_tickets";--> statement-breakpoint
ALTER TABLE "children" DROP COLUMN "legendary_pick_tickets";--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "easter_egg_tickets_non_negative" CHECK ("children"."easter_egg_tickets" >= 0);
