CREATE TABLE "ticket_grants" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" text NOT NULL,
	"column" text NOT NULL,
	"amount" integer NOT NULL,
	"source" text NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_grants_column_valid" CHECK ("ticket_grants"."column" IN ('pullTokens', 'easterEggTickets')),
	CONSTRAINT "ticket_grants_source_valid" CHECK ("ticket_grants"."source" IN ('admin', 'sacrifice'))
);
--> statement-breakpoint
CREATE TABLE "trade_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"a_child_id" text NOT NULL,
	"a_card_id" text NOT NULL,
	"b_child_id" text NOT NULL,
	"b_card_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket_grants" ADD CONSTRAINT "ticket_grants_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_events" ADD CONSTRAINT "trade_events_a_child_id_children_id_fk" FOREIGN KEY ("a_child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_events" ADD CONSTRAINT "trade_events_a_card_id_cards_id_fk" FOREIGN KEY ("a_card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_events" ADD CONSTRAINT "trade_events_b_child_id_children_id_fk" FOREIGN KEY ("b_child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trade_events" ADD CONSTRAINT "trade_events_b_card_id_cards_id_fk" FOREIGN KEY ("b_card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_grants_child_created_idx" ON "ticket_grants" USING btree ("child_id","created_at");--> statement-breakpoint
CREATE INDEX "trade_events_a_child_idx" ON "trade_events" USING btree ("a_child_id","created_at");--> statement-breakpoint
CREATE INDEX "trade_events_b_child_idx" ON "trade_events" USING btree ("b_child_id","created_at");