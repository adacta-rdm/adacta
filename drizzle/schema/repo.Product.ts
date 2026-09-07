import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer.ts";
import { ProductSeries } from "~/drizzle/schema/repo.ProductSeries.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * One thing a manufacturer sells, described once for everyone.
 *
 * A product is a description. The piece of equipment a laboratory owns is an
 * inventory entry, and several entries can share one product.
 */
export const Product = sqliteTable(
	"Product",
	{
		id: integer("product_id").primaryKey({ autoIncrement: true }),

		manufacturerId: integer("manufacturer_id")
			.notNull()
			.references(() => Manufacturer.id),

		/**
		 * The series this product belongs to, when the manufacturer groups it into
		 * one. Seventeen of thirty-one products do not.
		 */
		seriesId: integer("product_series_id").references(() => ProductSeries.id),

		/**
		 * The URL segment for this product, unique for its manufacturer. It is
		 * built from the product number, because the products of one series share
		 * a name. Nine EL-FLOW Select controllers are all called "F-201CV".
		 */
		slug: text("slug").notNull(),

		name: text("name").notNull(),

		/**
		 * The order code the manufacturer prints, for example
		 * "F-201CV-020-RGD-33-K". Two products of one series differ here.
		 */
		productNumber: text("product_number").notNull(),

		subtitle: text("subtitle").notNull(),

		description: text("description"),

		/**
		 * Where the product photograph is served from, for example
		 * "/catalog/bronkhorst/el-flow-select.webp".
		 */
		imagePath: text("image_path"),

		/**
		 * Where this product sits among the others of its series, counted from
		 * zero. The manufacturer orders them. A product in no series has none.
		 */
		seriesPosition: integer("series_position"),

		...metadata(),
	},
	(table) => [uniqueIndex("Product_slug_unique").on(table.manufacturerId, table.slug)],
);
