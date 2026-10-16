import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * A value that distinguishes one physical unit from the catalog model.
 */
export const EquipmentSpecification = sqliteTable(
	"EquipmentSpecification",
	{
		id: integer("equipment_specification_id").primaryKey({ autoIncrement: true }),

		equipmentId: integer("equipment_id")
			.notNull()
			.references(() => Equipment.id, { onDelete: "cascade" }),

		productSpecificationId: integer("product_specification_id")
			.notNull()
			.references(() => ProductSpecification.id),

		value: text("value").notNull(),

		...metadata(),
	},
	(table) => [
		uniqueIndex("EquipmentSpecification_equipment_product_specification_unique").on(
			table.equipmentId,
			table.productSpecificationId,
		),
	],
);
