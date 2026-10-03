CREATE TABLE "pull_claims" (
	"request_id" text PRIMARY KEY NOT NULL,
	"child_id" text NOT NULL,
	"status" text NOT NULL,
	"fence" integer DEFAULT 1 NOT NULL,
	"spent_balance" integer,
	"outcome" jsonb,
	"claimed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pull_claims_status_valid" CHECK ("pull_claims"."status" IN ('granting', 'done'))
);
--> statement-breakpoint
ALTER TABLE "pull_claims" ADD CONSTRAINT "pull_claims_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pull_claims_child_idx" ON "pull_claims" USING btree ("child_id");