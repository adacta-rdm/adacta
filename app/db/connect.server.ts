/**
 * Database connections.
 *
 * There is one global database holding the repository list, and one file per
 * repository holding that repository's data. SQLite cannot enforce foreign keys
 * across files, so nothing references across the boundary.
 *
 * Migrations run on first open and are tracked by Drizzle, so reopening an
 * existing database is a no-op. Connections are cached for the process.
 */
import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const DB_DIR = Bun.env.ADACTA_DB_DIR ?? ".adacta/db";

type Db = ReturnType<typeof drizzle>;

const connections = new Map<string, Db>();

function open(file: string, migrationsFolder: string): Db {
	const cached = connections.get(file);
	if (cached) return cached;

	mkdirSync(DB_DIR, { recursive: true });

	const db = drizzle({ client: new Database(`${DB_DIR}/${file}`) });
	migrate(db, { migrationsFolder });

	connections.set(file, db);
	return db;
}

export function getGlobalDb(): Db {
	return open("global.sqlite", "drizzle/migrations/global");
}

/**
 * The repository slug is also its file name.
 */
export function getRepoDb(slug: string): Db {
	return open(`${slug}.sqlite`, "drizzle/migrations/repo");
}
