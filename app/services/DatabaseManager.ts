import { Database as SQLite } from "bun:sqlite";
import { mkdirSync } from "node:fs";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { Service } from "~/lib/serviceContainer/ServiceContainer";
import { Env } from "~/lib/utils/Env";

/**
 * See drizzle/schema/system.*.ts for what the system database holds.
 */
const SYSTEM_DB_NAME = "_system";

const SYSTEM_MIGRATIONS = "drizzle/migrations/system";
const REPO_MIGRATIONS = "drizzle/migrations/repo";

/**
 * The lifecycle of the SQLite files. Where they live, what they may be called,
 * whether they are open, and whether their schema is current.
 *
 * This module creates, opens, migrates, and deletes the database files.
 * RepoManager keeps the repository records.
 *
 * Migration is explicit. The repository database is bound to a request. A
 * migration on open would therefore run on every request.
 */
@Service(Env)
export class DatabaseManager {
	readonly #connections = new Map<string, ReturnType<typeof drizzle>>();
	readonly #dbDir: string;

	constructor(env: Env) {
		this.#dbDir = env.string("ADACTA_DB_DIR", ".adacta/db");

		mkdirSync(this.#dbDir, { recursive: true });
	}

	/**
	 * The one system database.
	 */
	system() {
		return this.#open(SYSTEM_DB_NAME);
	}

	/**
	 * One repository's database. The slug is also the file name.
	 */
	repoDb(slug: string) {
		return this.#open(this.#validated(slug));
	}

	migrateSystem(): void {
		migrate(this.system(), { migrationsFolder: SYSTEM_MIGRATIONS });
	}

	migrateRepository(slug: string): void {
		migrate(this.repoDb(slug), { migrationsFolder: REPO_MIGRATIONS });
	}

	#open(dbName: string) {
		let connection = this.#connections.get(dbName);

		if (!connection) {
			const client = new SQLite(`${this.#dbDir}/${dbName}.sqlite`);

			// SQLite checks foreign keys only when asked. The setting belongs to the
			// connection rather than to the file. Every connection therefore turns it
			// on. A migration that rebuilds a table has to use
			// "PRAGMA defer_foreign_keys" instead. This setting does nothing inside a
			// transaction.
			client.run("PRAGMA foreign_keys = ON");

			connection = drizzle({ client });
			this.#connections.set(dbName, connection);
		}

		return connection;
	}

	/**
	 * A slug becomes a file name. Anything outside this set could therefore
	 * escape the database directory. This is the only place that turns a name
	 * into a path. The check lives here for that reason and not in a caller.
	 */
	#validated(slug: string): string {
		if (!/^[a-zA-Z0-9-_]+$/.test(slug) || slug === SYSTEM_DB_NAME) {
			throw new InvalidDatabaseNameError(slug);
		}

		return slug;
	}
}

/**
 * The name is unusable as a file name, or is reserved.
 */
export class InvalidDatabaseNameError extends Error {
	constructor(public readonly name: string) {
		super(`Invalid database name "${name}".`);
		this.name = "InvalidDatabaseNameError";
	}
}
