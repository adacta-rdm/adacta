import { Database as SQLite } from "bun:sqlite";
import { mkdirSync, readdirSync, rmSync } from "node:fs";

import type { AnyRelations } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

import { authRelations } from "~/drizzle/schema/system.BetterAuth.ts";
import { Env } from "~/lib/env/Env.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";

/**
 * See drizzle/schema/system.*.ts for what the system database holds.
 */
const SYSTEM_DB_NAME = "_system";

const SUFFIX = ".sqlite";

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
		return this.#open(SYSTEM_DB_NAME, authRelations);
	}

	/**
	 * One repository's database. The slug is also the file name.
	 */
	repoDb(slug: string) {
		return this.#open(this.#validated(slug), undefined);
	}

	migrateSystem(): void {
		migrate(this.system(), { migrationsFolder: SYSTEM_MIGRATIONS });
	}

	migrateRepository(slug: string): void {
		migrate(this.repoDb(slug), { migrationsFolder: REPO_MIGRATIONS });
	}

	/**
	 * Delete the system database. Everything it holds goes with it.
	 */
	dropSystem(): void {
		this.#drop(SYSTEM_DB_NAME);
	}

	/**
	 * Delete one repository's database, with all of its data.
	 */
	dropRepository(slug: string): void {
		this.#drop(this.#validated(slug));
	}

	/**
	 * Delete every database in the directory, the system one included.
	 *
	 * This works from the files rather than from the repository records. A file
	 * that no record refers to is therefore deleted as well. A reset reaches the
	 * same state whether the directory was empty or still held old files.
	 */
	dropAll(): void {
		for (const file of readdirSync(this.#dbDir)) {
			if (file.endsWith(SUFFIX)) this.#drop(file.slice(0, -SUFFIX.length));
		}
	}

	#open<TRelations extends AnyRelations | undefined>(dbName: string, relations: TRelations) {
		let connection = this.#connections.get(dbName);

		if (!connection) {
			const client = new SQLite(`${this.#dbDir}/${dbName}${SUFFIX}`);

			// SQLite checks foreign keys only when asked. The setting belongs to the
			// connection rather than to the file. Every connection therefore turns it
			// on. A migration that rebuilds a table has to use
			// "PRAGMA defer_foreign_keys" instead. This setting does nothing inside a
			// transaction.
			client.run("PRAGMA foreign_keys = ON");

			connection = drizzle({ client, relations });
			this.#connections.set(dbName, connection);
		}

		return connection;
	}

	/**
	 * Close the connection before removing the file. Forget it as well. A later
	 * open then builds a new database instead of returning the closed
	 * connection.
	 *
	 * Deleting a database that is not there is not an error. The end state is
	 * the one the caller asked for.
	 */
	#drop(dbName: string): void {
		this.#connections.get(dbName)?.$client.close();
		this.#connections.delete(dbName);

		rmSync(`${this.#dbDir}/${dbName}${SUFFIX}`, { force: true });
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
