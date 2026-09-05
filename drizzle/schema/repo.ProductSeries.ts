import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer";
import { metadata } from "~/drizzle/schemaHelpers/metadata";

/**
 * A family of products a manufacturer sells together.
 *
 * Products in one series differ in a few specifications and share the rest.
 * For example the STA 509 Jupiter series differs in furnace and temperature
 * range. A product does not have to belong to a series.
 */
export const ProductSeries = sqliteTable(
	"ProductSeries",
	{
		id: integer("product_series_id").primaryKey({ autoIncrement: true }),

		manufacturerId: integer("manufacturer_id")
			.notNull()
			.references(() => Manufacturer.id),

		/**
		 * The URL segment for this series, built from its name and unique for its
		 * manufacturer. For example "STA 509 Jupiter®" gives "sta-509-jupiter".
		 */
		slug: text("slug").notNull(),

		name: text("name").notNull(),

		subtitle: text("subtitle"),

		description: text("description"),

		website: text("website"),

		...metadata(),
	},
	(table) => [uniqueIndex("ProductSeries_slug_unique").on(table.manufacturerId, table.slug)],
);
