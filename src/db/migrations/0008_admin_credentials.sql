CREATE TABLE "admin_credentials" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"counter" integer DEFAULT 0 NOT NULL,
	"transports" text DEFAULT '' NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "admin_credentials_credential_id_idx" ON "admin_credentials" USING btree ("credential_id");--> statement-breakpoint
CREATE INDEX "admin_credentials_parent_idx" ON "admin_credentials" USING btree ("parent_id");