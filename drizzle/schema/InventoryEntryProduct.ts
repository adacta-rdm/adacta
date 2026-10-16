import { integer, sqliteTable } from "drizzle-orm/sqlite-core";

import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * The catalog product from which one physical inventory entry was created.
 *
 * Several entries can describe units of one product. An entry appears at most
 * once because this relation records its source model rather than a tag.
 */
export const InventoryEntryProduct = sqliteTable("InventoryEntryProduct", {
	inventoryEntryId: integer("inventory_entry_id")
		.primaryKey()
		.references(() => InventoryEntry.id, { onDelete: "cascade" }),

	productId: integer("product_id")
		.notNull()
		.references(() => Product.id),

	...metadata(),
});
