import { pgSchema } from "drizzle-orm/pg-core";
import { varchar } from "drizzle-orm/pg-core";
import { serial, char, timestamp } from "drizzle-orm/pg-core";

export const Migration = pgSchema("adacta_migrations").table("Migration", {
	id: serial("migration_id").primaryKey().notNull(),

	/**
	 * The name of the migration file.
	 */
	filename: varchar("filename").notNull(),

	/**
	 * The sha256 hash of the migration file, before any transformations are applied.
	 */
	hash: char("hash", { length: 64 }).notNull(),

	/**
	 * The timestamp when the migration was applied.
	 */
	executedAt: timestamp("executed_at", { precision: 3 }).notNull(),
});
