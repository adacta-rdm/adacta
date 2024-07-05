import type { PgSchema } from "drizzle-orm/pg-core";
import { primaryKey, varchar } from "drizzle-orm/pg-core";

import { User } from "~/drizzle/schema/global.User";
import { idType } from "~/drizzle/schemaHelpers/idType";
import type { IUserId } from "~/lib/database/Ids";

/**
 * This table is used to store the repositories that a user has access to.
 */
export function UserRepository(schemas: { global: PgSchema }) {
	return schemas.global.table(
		"UserRepository",
		{
			userId: idType<IUserId>("user_id")
				.notNull()
				.references(() => User(schemas).id, { onDelete: "restrict", onUpdate: "cascade" }),
			repositoryName: varchar("repository_name", { length: 255 }).notNull(),
		},
		(t) => {
			return {
				pk: primaryKey({ columns: [t.userId, t.repositoryName] }),
			};
		}
	);
}
