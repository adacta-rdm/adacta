import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { PIDEdgeKind as PIDEdgeKindName, PIDLengthUnit } from "~/app/lib/PID.ts";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { PIDEdgeKind } from "~/drizzle/schema/repo.PIDEdgeKind.ts";
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
		 * The kind records what the connection represents. The application draws
		 * each kind differently. For example, a jacketed pipe appears as two
		 * parallel lines.
		 *
		 * The PIDEdgeKind table lists the kinds the application supports. A
		 * renamed kind carries its connections with it, because the reference
		 * updates on cascade.
		 */
		kind: text("kind")
			.notNull()
			.$type<PIDEdgeKindName>()
			.references(() => PIDEdgeKind.id, { onUpdate: "cascade" }),

		/**
		 * How heavy the line is drawn, from 1 to 3. A main line is drawn heavier
		 * than a branch. The weight says nothing about the bore of the pipe.
		 */
		weight: integer("weight").notNull(),

		/** Stores whether an arrow is drawn at the target end. */
		endArrow: integer("end_arrow", { mode: "boolean" }).notNull(),

		/** Stores integer percentages for arrows between the two ends. */
		arrowPositions: text("arrow_positions", { mode: "json" }).$type<number[]>().notNull(),

		/**
		 * What the pipe is made of, as the laboratory writes it. For example,
		 * "stainless steel 1.4571".
		 */
		material: text("material"),

		/**
		 * The bore of the pipe, the outside of the pipe, and the length of the
		 * run.
		 *
		 * Each measurement keeps the unit it was written in, because a tube
		 * ordered as 1/4 inch is recorded as 1/4 inch. A value is stored only
		 * together with its unit, which the check below enforces.
		 */
		innerDiameterValue: real("inner_diameter_value"),
		innerDiameterUnit: text("inner_diameter_unit").$type<PIDLengthUnit>(),
		outerDiameterValue: real("outer_diameter_value"),
		outerDiameterUnit: text("outer_diameter_unit").$type<PIDLengthUnit>(),
		lengthValue: real("length_value"),
		lengthUnit: text("length_unit").$type<PIDLengthUnit>(),

		sourceHandle: text("source_handle"),
		targetHandle: text("target_handle"),
		drawingOrder: integer("drawing_order").notNull(),

		...metadata(),
	},
	(table) => [
		index("PIDEdge_inventory_entry_idx").on(table.inventoryEntryId),
		check("PIDEdge_weight_check", sql`${table.weight} between 1 and 3`),

		// A measurement without its unit cannot be read, and a unit without a
		// measurement says nothing. Each pair is therefore written together or
		// left empty together.
		check(
			"PIDEdge_inner_diameter_check",
			sql`(${table.innerDiameterValue} is null) = (${table.innerDiameterUnit} is null)`,
		),
		check(
			"PIDEdge_outer_diameter_check",
			sql`(${table.outerDiameterValue} is null) = (${table.outerDiameterUnit} is null)`,
		),
		check(
			"PIDEdge_length_check",
			sql`(${table.lengthValue} is null) = (${table.lengthUnit} is null)`,
		),
	],
);
