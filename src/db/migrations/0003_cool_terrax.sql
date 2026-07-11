CREATE TABLE IF NOT EXISTS "quiz_completions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" text NOT NULL,
	"topic" text NOT NULL,
	"correct" integer NOT NULL,
	"total" integer NOT NULL,
	"passed" boolean NOT NULL,
	"awarded" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_completions" ADD CONSTRAINT "quiz_completions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "quiz_completions_child_created_idx" ON "quiz_completions" USING btree ("child_id","created_at");