import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Id } from "~/drizzle/schema/Id.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * A standalone experimental device with a location that the laboratory builds
 * or whose components it describes in detail, such as a catalyst test stand. A
 * sample is taken to a rig to obtain a result. A rig has a P&ID, notes, and data
 * views. A store-bought instrument whose inside is not described, such as an
 * X-ray diffractometer, is Equipment.
 */
export const Rig = sqliteTable(
	"Rig",
	{
		id: integer("rig_id")
			.primaryKey()
			.references(() => Id.id),

		slug: text("slug").notNull(),

		/**
		 * The name of this experimental device.
		 */
		name: text("name").notNull(),

		/**
		 * Where the rig stands. Building and room identifiers are text because
		 * organization-specific labels are often alphanumeric, such as "B3".
		 */
		locationBuildingIdentifier: text("location_building_identifier"),
		locationRoomIdentifier: text("location_room_identifier"),
		locationLabel: text("location_label"),
		...metadata(),
	},
	(table) => [
		uniqueIndex("Rig_slug_unique").on(table.slug),
		check("Rig_slug_check", sql`length(${table.slug}) > 0`),
	],
);
