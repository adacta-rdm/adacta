import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { PIDNode } from "~/drizzle/schema/repo.PIDNode.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One directed process connection in the current P&ID of an inventory entry.
 */
export const PIDEdge = sqliteTable(
	"PIDEdge",
	{
		id: text("pid_edge_id").primaryKey(),

		inventoryEntryId: integer("inventory_entry_id")
			.notNull()
			.references(() => InventoryEntry.id, { onDelete: "cascade" }),

		sourceNodeId: text("source_node_id")
			.notNull()
			.references(() => PIDNode.id, { onDelete: "cascade" }),
		targetNodeId: text("target_node_id")
			.notNull()
			.references(() => PIDNode.id, { onDelete: "cascade" }),
		sourceHandle: text("source_handle"),
		targetHandle: text("target_handle"),
		drawingOrder: integer("drawing_order").notNull(),

		...metadata(),
	},
	(table) => [index("PIDEdge_inventory_entry_idx").on(table.inventoryEntryId)],
);
