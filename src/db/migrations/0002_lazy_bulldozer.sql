ALTER TABLE "children" ADD COLUMN "epic_tickets" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "children" ADD COLUMN "lucky_tickets" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "epic_tickets_non_negative" CHECK ("children"."epic_tickets" >= 0);--> statement-breakpoint
ALTER TABLE "children" ADD CONSTRAINT "lucky_tickets_non_negative" CHECK ("children"."lucky_tickets" >= 0);