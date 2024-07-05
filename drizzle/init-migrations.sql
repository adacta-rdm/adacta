CREATE SCHEMA IF NOT EXISTS "adacta_migrations";
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adacta_migrations"."Migration" (
	"migration_id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"hash" char(64) NOT NULL,
	"executed_at" timestamp(3) NOT NULL
);