import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Id } from "~/drizzle/schema/Id.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One physical unit of a catalog product. The product supplies its name.
 */
export const Equipment = sqliteTable(
	"Equipment",
	{
		id: integer("equipment_id")
			.primaryKey()
			.references(() => Id.id),

		slug: text("slug").notNull(),

		productId: integer("product_id")
			.notNull()
			.references(() => Product.id),

		/**
		 * The manufacturer's identifier for this physical unit, unique per product.
		 * SQLite permits several empty values in a unique index.
		 */
		serialNumber: text("serial_number"),

		/**
		 * The building where the unit stands. Building and room names are text
		 * because they can contain letters and numbers, such as "B3" and "101a".
		 */
		building: text("building"),

		/**
		 * The room where the unit stands.
		 */
		room: text("room"),

		/**
		 * The position within the room, for example "Cabinet A".
		 */
		position: text("position"),
		...metadata(),
	},
	(table) => [
		uniqueIndex("Equipment_slug_unique").on(table.slug),
		check("Equipment_slug_check", sql`length(${table.slug}) > 0`),
		uniqueIndex("Equipment_product_serial_number_unique").on(table.productId, table.serialNumber),
	],
);
