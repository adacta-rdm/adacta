import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { Product } from "~/drizzle/schema/Product.ts";
import { QuantityKind } from "~/drizzle/schema/QuantityKind.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

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

	/**
	 * The quantity kind of the value, if it has one. For example, a maximum
	 * capacity is a mass. A seal material has no quantity kind.
	 */
	quantityKindId: text("quantity_kind_id").references(() => QuantityKind.id, {
		onUpdate: "cascade",
	}),

	/**
	 * If null and the `required` column is set to true, then the user must
	 * supply a value when importing this product. Its value will be recorded
	 * in the `EquipmentSpecification` table in that case.
	 *
	 * If null and the `required` column is false, then the user still gets
	 * a form presented when importing, but is not required to provide a value.
	 *
	 * The third case is when this value is set, in which case the value is
	 * fixed and cannot be edited by the user.
	 */
	value: text("value"),

	/**
	 * Whether a value must be supplied to create the physical entry. It applies
	 * only when `value` is null.
	 */
	required: integer("required", { mode: "boolean" }).notNull().default(true),

	/**
	 * Explains the value requested for one physical unit.
	 */
	description: text("description"),

	...metadata(),
});
