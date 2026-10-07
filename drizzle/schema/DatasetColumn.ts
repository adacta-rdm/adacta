import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Channel } from "~/drizzle/schema/Channel.ts";
import { Dataset } from "~/drizzle/schema/Dataset.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";

/**
 * A dataset column records the meaning of one CSV column at import.
 * Its labels and diagram references preserve the values resolved at that time.
 */
export const DatasetColumn = sqliteTable(
	"DatasetColumn",
	{
		id: integer("dataset_column_id").primaryKey({ autoIncrement: true }),
		datasetId: integer("dataset_id")
			.notNull()
			.references(() => Dataset.id),
		/**
		 * This zero-based position matches the CSV and sidecar column lists.
		 */
		position: integer("position").notNull(),
		/**
		 * This name comes from the sidecar. It must match the CSV header when one is present.
		 */
		name: text("name").notNull(),
		/**
		 * This key identifies the field in Parquet. For example, the third field uses column_2.
		 */
		fieldName: text("field_name").notNull(),
		parquetType: text("parquet_type").notNull(),
		/**
		 * This is time, date, numeric, or skip for special columns. It is null for channels.
		 */
		axis: text("axis"),
		symbolKey: text("symbol_key"),
		inventoryEntryId: integer("inventory_entry_id").references(() => InventoryEntry.id),
		/**
		 * This is the equipment name at import. The linked record can later be renamed.
		 */
		inventoryName: text("inventory_name"),
		channelId: integer("channel_id").references(() => Channel.id),
		channelKey: text("channel_key"),
		channelRole: text("channel_role"),
		quantityKindId: text("quantity_kind_id"),
		/**
		 * These gas names were traced through the P&ID at import.
		 */
		gasName: text("gas_name"),
		unit: text("unit"),
		/**
		 * This identifies the P&ID node at import. The diagram can later replace its nodes.
		 */
		pidNodeId: text("pid_node_id"),
	},
	(table) => [
		uniqueIndex("DatasetColumn_dataset_position_unique").on(table.datasetId, table.position),
		index("DatasetColumn_inventory_entry_idx").on(table.inventoryEntryId),
	],
);
