CREATE TABLE "easter_egg_claims" (
	"jti" text PRIMARY KEY NOT NULL,
	"child_id" text NOT NULL,
	"card_id" text NOT NULL,
	"status" text NOT NULL,
	"outcome" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "easter_egg_claims_status_valid" CHECK ("easter_egg_claims"."status" IN ('granting', 'done'))
);
--> statement-breakpoint
ALTER TABLE "easter_egg_claims" ADD CONSTRAINT "easter_egg_claims_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "easter_egg_claims" ADD CONSTRAINT "easter_egg_claims_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "easter_egg_claims_child_idx" ON "easter_egg_claims" USING btree ("child_id");