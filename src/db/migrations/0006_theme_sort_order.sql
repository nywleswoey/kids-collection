-- Inc21: give themes an explicit display order. Until now the pull screen's
-- category chips came from an unordered SELECT, so their order was incidental
-- (and could reshuffle whenever `seed --sync` rewrote a row). Freeze the order
-- rows scan in *today* — which is exactly the order children see — then let
-- seed/cards.json own it from here on.
ALTER TABLE "themes" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
UPDATE "themes" t SET "sort_order" = s.rn
FROM (
  SELECT "id", (row_number() OVER (ORDER BY ctid)) - 1 AS rn FROM "themes"
) s
WHERE t."id" = s."id";
