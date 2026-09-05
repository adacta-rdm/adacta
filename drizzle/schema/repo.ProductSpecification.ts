import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { Product } from "~/drizzle/schema/repo.Product";
import { metadata } from "~/drizzle/schemaHelpers/metadata";

/**
 * One line of the technical description of a product.
 *
 * The value is text. A specification sheet writes "Vacuum to 64 bar" and
 * "±0.5% RD + ±0.1% FS", which no single number captures.
 */
export const ProductSpecification = sqliteTable("ProductSpecification", {
	id: integer("product_specification_id").primaryKey({ autoIncrement: true }),

	productId: integer("product_id")
		.notNull()
		.references(() => Product.id),

	/**
	 * Where this line sits in the sheet, counted from zero. The manufacturer
	 * orders the lines, and two products of one series are compared by reading
	 * them in the same order.
	 */
	position: integer("position").notNull(),

	name: text("name").notNull(),

	value: text("value").notNull(),

	...metadata(),
});
