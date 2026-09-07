import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer.ts";
import { Product } from "~/drizzle/schema/repo.Product.ts";
import { ProductSeries } from "~/drizzle/schema/repo.ProductSeries.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * Where a catalog record was read from, and when.
 *
 * A specification sheet is revised and a web page is rewritten. The record
 * therefore says which document it came from and on which day, so a reader can
 * tell whether it still describes the product.
 *
 * Exactly one of the three references is set. A manufacturer may cite several
 * documents; a series and a product each cite one. The references are kept as
 * separate columns so every one of them is a real foreign key.
 */
export const CatalogSource = sqliteTable("CatalogSource", {
	id: integer("catalog_source_id").primaryKey({ autoIncrement: true }),

	manufacturerId: integer("manufacturer_id").references(() => Manufacturer.id),
	seriesId: integer("product_series_id").references(() => ProductSeries.id),
	productId: integer("product_id").references(() => Product.id),

	url: text("url").notNull(),

	title: text("title"),

	/**
	 * The moment the document was read.
	 */
	retrievedAt: integer("retrieved_at", { mode: "timestamp" }).notNull(),

	...metadata(),
});
