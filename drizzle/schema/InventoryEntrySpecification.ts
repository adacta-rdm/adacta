import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { ProductSpecification } from "~/drizzle/schema/ProductSpecification.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * A value that distinguishes one physical unit from the catalog model.
 */
export const InventoryEntrySpecification = sqliteTable(
	"InventoryEntrySpecification",
	{
		id: integer("inventory_entry_specification_id").primaryKey({ autoIncrement: true }),

		inventoryEntryId: integer("inventory_entry_id")
			.notNull()
			.references(() => InventoryEntry.id, { onDelete: "cascade" }),

		productSpecificationId: integer("product_specification_id")
			.notNull()
			.references(() => ProductSpecification.id),

		value: text("value").notNull(),

		...metadata(),
	},
	(table) => [
		uniqueIndex("InventoryEntrySpecification_entry_product_specification_unique").on(
			table.inventoryEntryId,
			table.productSpecificationId,
		),
	],
);
