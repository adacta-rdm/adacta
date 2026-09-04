import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { metadata } from "~/drizzle/schemaHelpers/metadata";

/**
 * Material prepared together and represented by one or more physical samples.
 */
export const SampleBatch = sqliteTable(
	"SampleBatch",
	{
		id: integer("sample_batch_id").primaryKey({ autoIncrement: true }),

		slug: text("slug").notNull(),

		name: text("name").notNull(),

		/**
		 * Calendar date on which the batch material was prepared.
		 */
		preparationDate: text("preparation_date").notNull(),

		/**
		 * User credited with preparing the batch material.
		 */
		preparedById: text("prepared_by").notNull(),

		/**
		 * The active component, for example "Pt" or "Ni".
		 */
		activeMaterial: text("active_material"),

		/**
		 * The material supporting the active component, for example "Al2O3".
		 */
		support: text("support"),

		...metadata(),
	},
	(table) => [uniqueIndex("SampleBatch_slug_unique").on(table.slug)],
);
