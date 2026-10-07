import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { MeasurementDataset } from "~/drizzle/schema/MeasurementDataset.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";

/**
 * A sample named by an imported sidecar.
 */
export const MeasurementSample = sqliteTable(
	"MeasurementSample",
	{
		datasetId: integer("measurement_dataset_id")
			.notNull()
			.references(() => MeasurementDataset.id),
		position: integer("position").notNull(),
		sampleId: integer("sample_id")
			.notNull()
			.references(() => Sample.id),
		sampleName: text("sample_name").notNull(),
		sampleBatchName: text("sample_batch_name"),
		symbolKey: text("symbol_key").notNull(),
		identifier: text("identifier").notNull(),
		pidNodeId: text("pid_node_id").notNull(),
		anchorNodeId: text("anchor_node_id"),
		inletNodeIds: text("inlet_node_ids", { mode: "json" }).$type<string[]>().notNull(),
		outletNodeIds: text("outlet_node_ids", { mode: "json" }).$type<string[]>().notNull(),
	},
	(table) => [
		uniqueIndex("MeasurementSample_dataset_position_unique").on(table.datasetId, table.position),
	],
);
