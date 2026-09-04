import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";
import { metadata } from "~/drizzle/schemaHelpers/metadata";

/**
 * One physical portion of a sample batch.
 *
 * The name is the label as written on the physical sample. It is unique only
 * within its batch.
 */
export const Sample = sqliteTable(
	"Sample",
	{
		id: integer("sample_id").primaryKey({ autoIncrement: true }),

		batchId: integer("sample_batch_id")
			.notNull()
			.references(() => SampleBatch.id),

		slug: text("slug").notNull(),

		name: text("name").notNull(),

		/**
		 * User credited with preparing this physical sample.
		 */
		preparedById: text("prepared_by").notNull(),

		...metadata(),
	},
	(table) => [
		uniqueIndex("Sample_batch_name_unique").on(table.batchId, table.name),
		uniqueIndex("Sample_batch_slug_unique").on(table.batchId, table.slug),
	],
);
