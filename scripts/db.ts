/**
 * Commands for the application database.
 *
 *   bun scripts/db.ts <migrate|refresh|reset|setup> [preset]
 *
 *   migrate  apply pending SQL migrations
 *   refresh  replace the migration history with the current schema baseline
 *   reset    delete the database and migrate from scratch
 *   setup    reset and load one preset, defaulting to demo
 *
 * Only setup accepts a preset name. Bun loads environment values from .env.
 */
import { rmSync } from "node:fs";

import { createAppContainer } from "~/app/.server/appContainer.ts";
import { migrateSqliteDatabase } from "~/app/.server/migrateSqliteDatabase.ts";
import { sqliteDatabasePath } from "~/app/.server/sqliteDatabase.ts";
import { Env } from "~/lib/env/Env.ts";
import { refreshMigrations } from "~/scripts/db/refreshMigrations.ts";
import { assertPresetExists, seedDatabase } from "~/seed/seed.ts";

const COMMANDS = "migrate, refresh, reset, setup";

const [command, ...rest] = process.argv.slice(2);

if (command === "setup") {
	if (rest.length > 1) fail("setup accepts one preset name");
} else if (rest.length > 0) {
	fail(`Only setup accepts a preset name (got "${rest[0]}").`);
}

let container: ReturnType<typeof createAppContainer> | undefined;

// Migration commands do not delete database contents. The remaining commands do.
if (command !== "migrate" && command !== "refresh" && import.meta.env.NODE_ENV === "production") {
	fail(`Refusing production environment.`);
}

switch (command) {
	case "migrate":
		await migrate();
		break;

	case "refresh":
		await refreshMigrations();
		break;

	case "reset":
		await reset();
		break;

	case "setup":
		// Validate before resetting so a misspelled preset preserves the current database.
		assertPresetExists(rest[0] ?? "demo");
		await reset();
		await seedDatabase(app(), rest[0]);
		break;

	case undefined:
		fail(`missing command (expected: ${COMMANDS})`);
		break;

	default:
		fail(`unknown command "${command}" (expected: ${COMMANDS})`);
}

async function migrate(): Promise<void> {
	migrateSqliteDatabase(sqliteDatabasePath(new Env()));

	console.log("Migrations applied.");
}

/**
 * Delete the application database and migrate from scratch.
 * The result is the same whether the database was present or absent.
 */
async function reset(): Promise<void> {
	rmSync(sqliteDatabasePath(new Env()), { force: true });

	console.log("Database dropped.");

	await migrate();
}

function app(): ReturnType<typeof createAppContainer> {
	return (container ??= createAppContainer());
}

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}
