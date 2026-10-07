import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Dataset } from "~/drizzle/schema/Dataset.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";

/**
 * Each row links a dataset to one sample named by its sidecar.
 * Saved names and diagram positions describe the sample at import.
 */
export const DatasetSample = sqliteTable(
	"DatasetSample",
	{
		datasetId: integer("dataset_id")
			.notNull()
			.references(() => Dataset.id),
		/**
		 * This zero-based position matches the sidecar sample list.
		 */
		position: integer("position").notNull(),
		sampleId: integer("sample_id")
			.notNull()
			.references(() => Sample.id),
		sampleName: text("sample_name").notNull(),
		sampleBatchName: text("sample_batch_name"),
		symbolKey: text("symbol_key").notNull(),
		/**
		 * This JSON contains the sidecar's id or slug reference.
		 */
		identifier: text("identifier").notNull(),
		/**
		 * This identifies the P&ID node at import. The diagram can later replace its nodes.
		 */
		pidNodeId: text("pid_node_id").notNull(),
		/**
		 * These node IDs group chart channels before, at, and after the sample.
		 */
		anchorNodeId: text("anchor_node_id"),
		inletNodeIds: text("inlet_node_ids", { mode: "json" }).$type<string[]>().notNull(),
		outletNodeIds: text("outlet_node_ids", { mode: "json" }).$type<string[]>().notNull(),
	},
	(table) => [
		uniqueIndex("DatasetSample_dataset_position_unique").on(table.datasetId, table.position),
		index("DatasetSample_sample_idx").on(table.sampleId),
	],
);
