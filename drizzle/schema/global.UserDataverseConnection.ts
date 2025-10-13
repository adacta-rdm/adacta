import type { PgSchema } from "drizzle-orm/pg-core";
import { text, varchar } from "drizzle-orm/pg-core";

import { idType } from "~/drizzle/schemaHelpers/idType";
import { metadata } from "~/drizzle/schemaHelpers/metadata";
import type { IUserId } from "~/lib/database/Ids";

export function UserDataverseConnection(schemas: { global: PgSchema }) {
	return schemas.global.table("UserDataverseConnection", {
		id: idType<IUserId>("user_id").primaryKey().notNull().unique(),
		name: varchar("name").notNull(),
		url: text("url").notNull(),
		token: text("token").notNull(),

		...metadata(schemas), // TODO: onDelete/onUpdate?
	});
}
