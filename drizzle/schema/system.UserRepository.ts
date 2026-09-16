import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { User } from "~/drizzle/schema/system.BetterAuth.ts";
import { Repository } from "~/drizzle/schema/system.Repository.ts";

/**
 * Each row associates one user with one repository.
 *
 * A user with a sign-in account may open these repositories. A user without an
 * account can still be named in their records.
 */
export const UserRepository = sqliteTable(
	"UserRepository",
	{
		userId: text("user_id")
			.notNull()
			.references(() => User.id, { onDelete: "cascade" }),

		repositoryId: integer("repository_id")
			.notNull()
			.references(() => Repository.id, { onDelete: "cascade" }),
	},
	(table) => [primaryKey({ columns: [table.userId, table.repositoryId] })],
);
