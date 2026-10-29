import { Env } from "~/lib/env/Env.ts";
import { createBunAppContainer } from "~/runtimes/bun/appContainer.ts";
import { migrateSqliteDatabase, sqliteDatabasePath } from "~/runtimes/bun/sqliteDatabase.ts";
import { usersAdmin as manageUsers } from "~/scripts/usersAdmin.ts";

export async function usersAdmin(args: string[]): Promise<void> {
	const env = new Env();
	migrateSqliteDatabase(sqliteDatabasePath(env));
	await manageUsers(args, createBunAppContainer(env));
}
