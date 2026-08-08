-- Inc25 FR18: per-child memory of which GRAMMAR questions a child has already
-- ANSWERED. Until now `buildQuestions` sampled 5 from a ~16-question bank with no
-- memory at all, so the whole bank came round within days — the direct cause of
-- the children reporting they had seen a question before.
--
-- Rows are written on SUBMIT, never when the signed offer is minted, so an
-- abandoned quiz burns nothing.
--
-- `topic` is in the primary key deliberately. It makes the exhaustion reset a
-- single scoped DELETE, and it means question ids need only be unique WITHIN a
-- bank — today they are globally unique only by prefix convention (vt-, pp-, …),
-- which nothing tests, and the ~200-question authoring follow-up is exactly where
-- a cross-bank collision would appear. Without `topic`, such a collision would
-- silently merge two topics' seen-sets.
--
-- Growth is bounded by the authored banks: 6 topics x ~50 questions x 3 children
-- ~= 900 rows at saturation, so no pruning is needed.
--
-- Purely additive — no existing table is altered, and nothing here touches
-- `collections`, `children`, `cards` or `quiz_completions`.
CREATE TABLE IF NOT EXISTS "quiz_seen_questions" (
	"child_id" text NOT NULL,
	"topic" text NOT NULL,
	"question_id" text NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quiz_seen_questions_child_id_topic_question_id_pk" PRIMARY KEY("child_id","topic","question_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quiz_seen_questions" ADD CONSTRAINT "quiz_seen_questions_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
