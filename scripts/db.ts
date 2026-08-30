/**
 * `db:*` — commands that act on the databases as a whole. They take no
 * <repo> argument; repository administration lives in scripts/repo.ts.
 *
 *   bun scripts/db.ts <migrate|reset|setup|seed>
 *
 *   migrate  apply pending migrations to the system database and every repository
 *   reset    delete every database, then migrate from scratch
 *   setup    reset, then load the development seed
 *   seed     load the development seed
 *
 * Environment values come from the process. Bun loads a .env file into it
 * on its own.
 */
import { createAppContainer } from "~/app/createAppContainer.server";
import { DatabaseManager } from "~/app/services/DatabaseManager";
import { RepoManager } from "~/app/services/RepoManager";
import { Env } from "~/lib/utils/Env";
import { seedDatabase } from "~/seed/seed";

const COMMANDS = "migrate, reset, setup, seed";

const [command, ...rest] = process.argv.slice(2);

if (rest.length > 0) fail(`db commands take no arguments (got "${rest[0]}")`);

const container = createAppContainer();
const env = container.get(Env);

// Migrating is safe anywhere. Everything else deletes data.
if (command !== "migrate" && env.isProduction()) {
	fail(`Refusing production environment "${env.environment}".`);
}

switch (command) {
	case "migrate":
		migrate();
		break;

	case "reset":
		reset();
		break;

	case "setup":
		// Deleting first makes a seeded database the same every time, whatever
		// state it was in before.
		reset();
		await seedDatabase(container);
		break;

	case "seed":
		await seedDatabase(container);
		break;

	case undefined:
		fail(`missing command (expected: ${COMMANDS})`);
		break;

	default:
		fail(`unknown command "${command}" (expected: ${COMMANDS})`);
}

function migrate(): void {
	container.get(RepoManager).migrateAll();

	console.log("Migrations applied.");
}

/**
 * Delete every database, then migrate from scratch. Starting from an empty
 * directory makes the result the same whether the databases were already there
 * or not.
 */
function reset(): void {
	container.get(DatabaseManager).dropAll();

	console.log("Databases dropped.");

	migrate();
}

function fail(message: string): never {
	console.error(message);
	process.exit(1);
}
