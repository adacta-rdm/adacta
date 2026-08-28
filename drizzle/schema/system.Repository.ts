import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * A repository is one laboratory's data set.
 *
 * Each repository is a separate SQLite file, named after the slug. The slug is
 * also the URL segment. /demo/inventory therefore reads better than /1/inventory.
 */
export const Repository = sqliteTable("Repository", {
	id: integer("repository_id").primaryKey({ autoIncrement: true }),

	/**
	 * URL segment and file name, for example "demo".
	 */
	slug: text("slug").notNull().unique(),

	/**
	 * Display name, for example "Demo Laboratory".
	 */
	name: text("name").notNull(),

	createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
