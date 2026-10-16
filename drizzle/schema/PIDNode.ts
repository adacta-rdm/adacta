import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
	type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

import type { PIDInletCount, PIDOrientation, PIDSymbolKind } from "~/app/lib/PID.ts";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One symbol placed in the current P&ID of a rig.
 */
export const PIDNode = sqliteTable(
	"PIDNode",
	{
		id: text("pid_node_id").primaryKey(),

		rigId: integer("rig_id")
			.notNull()
			.references(() => Rig.id, { onDelete: "cascade" }),

		kind: text("kind").$type<PIDSymbolKind>().notNull(),
		label: text("label").notNull(),

		/**
		 * Stable identifier used by portable dataset sidecars.
		 */
		symbolKey: text("symbol_key"),

		/**
		 * Physical equipment represented by this symbol, when applicable.
		 */
		equipmentId: integer("equipment_id").references(() => Equipment.id, {
			onDelete: "set null",
		}),

		/**
		 * Sample represented by this symbol, when applicable.
		 */
		sampleId: integer("sample_id").references(() => Sample.id, { onDelete: "set null" }),

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
		inletCount: integer("inlet_count").$type<PIDInletCount>().notNull().default(1),
		orientation: integer("orientation").$type<PIDOrientation>().notNull(),
		positionX: real("position_x").notNull(),
		positionY: real("position_y").notNull(),

		...metadata(),
	},
	(table) => [
		index("PIDNode_rig_idx").on(table.rigId),
		uniqueIndex("PIDNode_rig_symbol_key_unique").on(table.rigId, table.symbolKey),
		check("PIDNode_inlet_count_check", sql`${table.inletCount} between 1 and 2`),
		check("PIDNode_orientation_check", sql`${table.orientation} between 0 and 3`),
	],
);
