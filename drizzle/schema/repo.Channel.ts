import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { Product } from "~/drizzle/schema/repo.Product.ts";
import { metadata } from "~/drizzle/schemaHelpers/metadata.ts";

/**
 * A stream of values a product can report, and therefore a capability of every
 * physical item of that product.
 *
 * A channel is defined once on the product. It is never copied to an item.
 * Adding a channel to a product therefore makes it available to every item of
 * that product at once.
 *
 * A recorded column of numbers is mapped to a channel. The channel is what says
 * what the numbers mean.
 */
export const Channel = sqliteTable(
	"Channel",
	{
		id: integer("channel_id").primaryKey({ autoIncrement: true }),

		productId: integer("product_id")
			.notNull()
			.references(() => Product.id),

		/**
		 * Where this channel sits in the product description, counted from zero.
		 */
		position: integer("position").notNull(),

		/**
		 * What is measured, for example "flow", "temperature", or
		 * "co2-concentration".
		 *
		 * The key does not say in what sense the value is meant. That is the role.
		 * A controller that reports a flow and also accepts a requested one has two
		 * channels with the key "flow", differing only in role. Do not write the
		 * role into the key as "actual-flow" or "flow-setpoint".
		 */
		key: text("key").notNull(),

		/**
		 * In what sense the key is meant.
		 *
		 *   measurement  a value the product reads
		 *   setpoint     a value the product is asked to reach
		 *   state        a continuous condition of the product itself
		 *   status       a discrete condition of the product itself
		 *
		 * One key is meaningful in more than one sense, so the role is part of the
		 * identity of a channel.
		 */
		role: text("role", { enum: ["measurement", "setpoint", "state", "status"] }).notNull(),

		/**
		 * What the values represent, for example "volumetric_flow" or
		 * "temperature". A channel that carries no physical quantity leaves it
		 * empty. How far a valve is opened is such a channel.
		 *
		 * This says what the channel is. It does not say how one file expressed it.
		 * The unit belongs to the recording, because the same device can log in
		 * ml/min for one file and l/h for the next.
		 *
		 * TODO: decide whether this becomes a narrowed set of names. A quantity
		 * kind the units library cannot convert between is not usable, so
		 * accepting any text stores something the application cannot act on. It is
		 * text today because the catalog names the kinds and an external catalog
		 * will name more of them. Settle this with the rest of the Values work.
		 */
		quantityKind: text("quantity_kind"),

		/**
		 * What this channel means, in enough detail that someone who did not set it
		 * up can tell whether it is the series they want.
		 *
		 * Two channels of one product can share a role, a quantity kind, and a unit
		 * while measuring different things. Two thermocouples at different points
		 * in a reactor are such a pair. The description is often the only place
		 * that difference is written down.
		 */
		description: text("description"),

		...metadata(),
	},
	/*
		A channel is identified by its key and its role together. The pair is
		stable within the product, which is what lets a recording refer to it
		across files and repositories.
	*/
	(table) => [uniqueIndex("Channel_key_role_unique").on(table.productId, table.key, table.role)],
);
