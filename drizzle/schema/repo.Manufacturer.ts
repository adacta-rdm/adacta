import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { metadata } from "~/drizzle/schemaHelpers/metadata";

/**
 * A company whose products appear in the catalog.
 *
 * The catalog describes what can be bought. An inventory entry describes one
 * piece of equipment that stands in a laboratory.
 */
export const Manufacturer = sqliteTable(
	"Manufacturer",
	{
		id: integer("manufacturer_id").primaryKey({ autoIncrement: true }),

		/**
		 * The URL segment for this manufacturer, built from its name. For example
		 * "Bronkhorst" gives "bronkhorst".
		 */
		slug: text("slug").notNull(),

		name: text("name").notNull(),

		website: text("website"),

		description: text("description"),

		/**
		 * Where the logo is served from, for example
		 * "/catalog/bronkhorst/manufacturer-logo.png". Two of thirteen
		 * manufacturers have one.
		 */
		logoPath: text("logo_path"),

		...metadata(),
	},
	(table) => [uniqueIndex("Manufacturer_slug_unique").on(table.slug)],
);
