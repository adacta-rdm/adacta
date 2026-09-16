/**
 * `db:*` — commands that act on the databases as a whole. They take no
 * <repo> argument; repository administration lives in scripts/repo.ts.
 *
 *   bun scripts/db.ts <migrate|refresh|reset|setup|seed>
 *
 *   migrate  apply pending migrations to the system database and every repository
 *   refresh  replace both migration histories with current baseline migrations
 *   reset    delete every database, then migrate from scratch
 *   setup    reset, then load the development seed
 *   seed     load the development seed
 *
 * Environment values come from the process. Bun loads a .env file into it
 * on its own.
 */
import { createAppContainer } from "~/app/.server/appContainer.ts";
import { SqliteDatabaseManager } from "~/app/services/SqliteDatabaseManager.ts";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { refreshMigrations } from "~/scripts/db/refreshMigrations.ts";
import { seedDatabase } from "~/seed/seed.ts";

const COMMANDS = "migrate, refresh, reset, setup, seed";

const [command, ...rest] = process.argv.slice(2);

if (rest.length > 0) fail(`db commands take no arguments (got "${rest[0]}")`);

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
		// Deleting first makes a seeded database the same every time, whatever
		// state it was in before.
		await reset();
		await seedDatabase(app());
		break;

	case "seed":
		await seedDatabase(app());
		break;

	case undefined:
		fail(`missing command (expected: ${COMMANDS})`);
		break;

	default:
		fail(`unknown command "${command}" (expected: ${COMMANDS})`);
}

async function migrate(): Promise<void> {
	await app().get(RepoManager).migrateAll();

	console.log("Migrations applied.");
}

/**
 * Delete every database, then migrate from scratch. Starting from an empty
 * directory makes the result the same whether the databases were already there
 * or not.
 */
async function reset(): Promise<void> {
	app().get(SqliteDatabaseManager).dropAll();

	console.log("Databases dropped.");

	await migrate();
}

function app(): ReturnType<typeof createAppContainer> {
	return (container ??= createAppContainer());
}

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}
