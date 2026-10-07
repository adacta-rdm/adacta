import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Channel } from "~/drizzle/schema/Channel.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { MeasurementDataset } from "~/drizzle/schema/MeasurementDataset.ts";

/**
 * The resolved meaning of one sidecar column.
 */
export const MeasurementColumn = sqliteTable(
	"MeasurementColumn",
	{
		id: integer("measurement_column_id").primaryKey({ autoIncrement: true }),
		datasetId: integer("measurement_dataset_id")
			.notNull()
			.references(() => MeasurementDataset.id),
		position: integer("position").notNull(),
		name: text("name").notNull(),
		fieldName: text("field_name").notNull(),
		parquetType: text("parquet_type").notNull(),
		axis: text("axis"),
		symbolKey: text("symbol_key"),
		inventoryEntryId: integer("inventory_entry_id").references(() => InventoryEntry.id),
		inventoryName: text("inventory_name"),
		channelId: integer("channel_id").references(() => Channel.id),
		channelKey: text("channel_key"),
		channelRole: text("channel_role"),
		quantityKindId: text("quantity_kind_id"),
		gasName: text("gas_name"),
		unit: text("unit"),
		pidNodeId: text("pid_node_id"),
		sourceColumn: text("source_column").notNull(),
	},
	(table) => [
		uniqueIndex("MeasurementColumn_dataset_position_unique").on(table.datasetId, table.position),
	],
);
