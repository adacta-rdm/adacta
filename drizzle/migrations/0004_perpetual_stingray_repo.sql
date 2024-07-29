ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Device" ALTER COLUMN "search" SET DATA TYPE tsvector;
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Device" drop column "search";
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Device" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(short_id, ''))) STORED;
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Project" ALTER COLUMN "search" SET DATA TYPE tsvector;
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Project" drop column "search";
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Project" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, ''))) STORED;
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Resource" ALTER COLUMN "search" SET DATA TYPE tsvector;
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Resource" drop column "search";
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Resource" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, ''))) STORED;
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Sample" ALTER COLUMN "search" SET DATA TYPE tsvector;
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Sample" drop column "search";
--> statement-breakpoint
ALTER TABLE "SQL_SCHEMA_PLACEHOLDER"."Sample" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(name, ''))) STORED;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_device" ON "SQL_SCHEMA_PLACEHOLDER"."Device" USING gin ("search");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_project" ON "SQL_SCHEMA_PLACEHOLDER"."Project" USING gin ("search");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_resource" ON "SQL_SCHEMA_PLACEHOLDER"."Resource" USING gin ("search");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_search_sample" ON "SQL_SCHEMA_PLACEHOLDER"."Sample" USING gin ("search");