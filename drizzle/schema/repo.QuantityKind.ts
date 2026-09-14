import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * The quantity kinds a channel may name.
 *
 * The table holds the names and nothing else. It exists so that a channel can
 * carry a foreign key, which is what stops a channel naming a quantity kind
 * that is not there. What a kind means lives in `app/lib/quantities.ts`,
 * which is also the list `syncQuantityKinds` copies these rows from.
 */
export const QuantityKind = sqliteTable("QuantityKind", {
	/**
	 * The name of the kind, for example "VolumeFlowRate". It is a published term
	 * rather than one of ours, so a channel row says what it measures without a
	 * second table to read. See `app/lib/quantities.ts`.
	 */
	id: text("quantity_kind_id").primaryKey(),
});
