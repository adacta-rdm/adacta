import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { PIDNode } from "~/drizzle/schema/repo.PIDNode.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * A row describes one directed connection in the current P&ID of an inventory
 * entry.
 *
 * Most connections carry process fluid. A caption line does not. It is stored
 * in this table because it also joins two symbols.
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

		/**
		 * The kind records what the connection represents.
		 *
		 *   pipe      process fluid travels from one symbol to the other
		 *   jacketed  a pipe enclosed by a second pipe that heats or cools it
		 *   caption   a note attached to a symbol, carrying no process fluid
		 *
		 * The application draws each kind differently. For example, a jacketed
		 * pipe appears as two parallel lines.
		 */
		kind: text("kind", { enum: ["pipe", "jacketed", "caption"] }).notNull(),

		sourceHandle: text("source_handle"),
		targetHandle: text("target_handle"),
		drawingOrder: integer("drawing_order").notNull(),

		...metadata(),
	},
	(table) => [index("PIDEdge_inventory_entry_idx").on(table.inventoryEntryId)],
);
