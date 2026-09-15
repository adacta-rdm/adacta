import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	real,
	sqliteTable,
	text,
	type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

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

		/**
		 * A second line of text, for a symbol that carries two. An instrument
		 * holds what it does above what it is called, for example "MFC" above
		 * "H2". Every other symbol leaves this empty.
		 */
		secondaryLabel: text("secondary_label"),

		/**
		 * The symbol this one sits inside, where it sits inside one. Its position
		 * is then measured from the corner of that symbol rather than from the
		 * corner of the diagram, so it travels with it.
		 *
		 * Deleting a symbol deletes what sits inside it.
		 */
		parentNodeId: text("parent_node_id").references((): AnySQLiteColumn => PIDNode.id, {
			onDelete: "cascade",
		}),

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
