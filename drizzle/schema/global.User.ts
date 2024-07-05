import type { PgSchema } from "drizzle-orm/pg-core";
import { text, uniqueIndex, varchar } from "drizzle-orm/pg-core";

import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IUserId } from "~/lib/database/Ids";

export function User(schemas: { global: PgSchema }) {
	return schemas.global.table(
		"User",
		{
			id: idType<IUserId>("user_id").primaryKey().notNull().unique(),

			mikroORMId: idType<string>("mikroORMId").unique(),

			firstName: text("firstName").notNull(),
			lastName: text("lastName").notNull(),
			email: text("email").notNull(),
			passwordHash: text("passwordHash").notNull(),
			salt: text("salt").notNull(),
			locale: text("locale").notNull(),
			dateStyle: varchar("dateStyle", { enum: ["short", "medium", "full", "long"] }).notNull(),
			timeStyle: varchar("timeStyle", { enum: ["short", "medium", "full", "long"] }).notNull(),
		},
		(table) => {
			return {
				emailKey: uniqueIndex("User_email_key").on(table.email),
			};
		}
	);
}
