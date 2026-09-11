import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { PIDOrientation, PIDSymbolKind } from "~/app/lib/PID.ts";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One symbol placed in the current P&ID of an inventory entry.
 */
export const PIDNode = sqliteTable(
	"PIDNode",
	{
		id: text("pid_node_id").primaryKey(),

		inventoryEntryId: integer("inventory_entry_id")
			.notNull()
			.references(() => InventoryEntry.id, { onDelete: "cascade" }),

		kind: text("kind").$type<PIDSymbolKind>().notNull(),
		label: text("label").notNull(),
		drawingOrder: integer("drawing_order").notNull(),
		orientation: integer("orientation").$type<PIDOrientation>().notNull(),
		positionX: real("position_x").notNull(),
		positionY: real("position_y").notNull(),

		...metadata(),
	},
	(table) => [
		index("PIDNode_inventory_entry_idx").on(table.inventoryEntryId),
		check("PIDNode_orientation_check", sql`${table.orientation} between 0 and 3`),
	],
);
