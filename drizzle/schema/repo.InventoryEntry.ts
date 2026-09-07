import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * A physical thing that sits somewhere in the laboratory.
 *
 * Two kinds share this table:
 *
 *   rig        custom built, has a P&ID
 *   equipment  standalone vendor equipment, has a location but no P&ID
 *
 * NAMING: "InventoryEntry" is a placeholder. The term for this concept has not
 * been chosen yet. "Facility" is deliberately not used.
 */
export const InventoryEntry = sqliteTable(
	"InventoryEntry",
	{
		id: integer("inventory_entry_id").primaryKey({ autoIncrement: true }),

		/**
		 * The URL segment for this entry, taken from its name. A reader of a
		 * pasted link can therefore tell which entry it points at.
		 */
		slug: text("slug").notNull(),

		name: text("name").notNull(),

		kind: text("kind", { enum: ["rig", "equipment"] }).notNull(),

		/**
		 * Where the entry stands. The identifiers are organization-specific. They are
		 * text: building and room labels are often alphanumeric, for example "B3".
		 */
		locationBuildingIdentifier: text("location_building_identifier"),
		locationRoomIdentifier: text("location_room_identifier"),
		locationLabel: text("location_label"),

		...metadata(),
	},
	(table) => [uniqueIndex("InventoryEntry_slug_unique").on(table.slug)],
);
