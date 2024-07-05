import { max, sql } from "drizzle-orm";
import { pgSchema, varchar } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { PostgresConfig } from "../config/PostgresConfig";

import type { DrizzleDb } from "~/drizzle/DrizzleDb";
import { DrizzleGlobalSchema, DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { SQL_SCHEMA_PLACEHOLDER } from "~/drizzle/migrationConst";
import getMigrationFiles from "~/drizzle/migrations";
import migrationsJournal from "~/drizzle/migrations/meta/_journal.json";
import { Migration } from "~/drizzle/schema/migrations";
import { INIT_MIGRATIONS_SQL, INIT_REPO_SQL } from "~/lib/buildTimeConstants";
import type { Logger } from "~/lib/logger/Logger";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

const globalSchema = new DrizzleGlobalSchema();

/**
 * A service to handle the creation, deletion, and modification of individual repositories on the Postgres server.
 */
@Service(PostgresConfig)
export class RepositoryManagerPostgres {
	constructor(private ormConfig: PostgresConfig, private logger?: Logger) {}

	private _connection: postgres.Sql | undefined;

	/**
	 *
	 */
	private connection() {
		if (!this._connection) {
			this._connection = postgres(
				`postgres://${this.ormConfig.user}:${this.ormConfig.password}@${this.ormConfig.host}:${this.ormConfig.port}/${this.ormConfig.dbName}`,
				{
					ssl: "prefer",
					// Disable logging for NOTICE messages
					onnotice: () => {},
				}
			);
		}
		return this._connection;
	}

	public db(): DrizzleDb {
		return drizzle(this.connection(), {
			logger: false,
		});
	}

	public schema(repoName: string): DrizzleSchema {
		return DrizzleSchema.fromSchemaName(this.schemaName(repoName));
	}

	/**
	 * Returns a list of all repositories (i.e. schemas) on the Postgres server.
	 */
	async repositories(db = this.db()): Promise<string[]> {
		const result = await db.select().from(schemataTable);

		return (
			result
				.map((r) => r.schema_name)
				// A repo schema is identified by the prefix defined in the ORMConfig
				.filter((name) => name.startsWith(this.repoPrefix))
				// Remove the prefix from the schema name, as it is not part of the repo name
				.map((name) => name.slice(this.repoPrefix.length))
		);
	}
	//

	async migrate() {
		const db = this.db();

		this.logger?.info(`Migrating database.`);

		// Ensure that the migrations table exists. This is a no-op if the table already exists.
		await this.runSQLFile(db, INIT_MIGRATIONS_SQL);

		this.logger?.debug("Finished initializing migrations table.");

		const result = await db
			.select({ mostRecentMigration: max(Migration.executedAt) })
			.from(Migration);
		// Set to 0 if no migrations have been run yet
		const mostRecentMigration = result.at(0)?.mostRecentMigration?.getTime() ?? 0;

		this.logger?.info(`Last migration: ${mostRecentMigration}`);

		const migrationFiles = await getMigrationFiles();
		await db.transaction(async (db) => {
			const entries: { when: number; tag: string }[] = migrationsJournal.entries;

			// Filter out migrations that have already been run by comparing the timestamp of when the migration was
			// created to the timestamp of the most recently run migration.
			const migrations = entries.filter((entry) => entry.when >= mostRecentMigration);

			// Important to pass the db instance from the current transaction. Otherwise, the repositories method will
			// try to run a query using the main db instance by calling this.db(), which may cause a deadlock.
			const allRepositoryNames = await this.repositories(db);

			for (const { tag } of migrations) {
				const migrationList = migrationFiles[tag];
				if (!migrationList || migrationList.length === 0) {
					throw new Error(`No migrations found for tag ${tag}`);
				}

				// The order that the migrations run in is important. The order is as follows:

				// 1) global SQL
				for (const { filename, hash, type, migration } of migrationList) {
					if (type !== "global" || typeof migration !== "string") continue;
					this.logger?.info(`Running ${type} migration: ${filename}`);
					await this.runSQLFile(db, migration);
					await db.insert(Migration).values({ filename, hash, executedAt: new Date() });
				}

				// 2) global script
				for (const { filename, hash, type, migration } of migrationList) {
					if (type !== "global" || typeof migration !== "function") continue;
					this.logger?.info(`Running ${type} migration: ${filename}`);
					await migration(db, globalSchema);
					await db.insert(Migration).values({ filename, hash, executedAt: new Date() });
				}

				// 3) repo SQL
				for (const { filename, hash, type, migration } of migrationList) {
					if (type !== "repo" || typeof migration !== "string") continue;
					this.logger?.info(`Running ${type} migration: ${filename}`);
					for (const repoName of allRepositoryNames) {
						await this.runSQLFile(db, migration, repoName);
					}
					await db.insert(Migration).values({ filename, hash, executedAt: new Date() });
				}

				// 4) repo script
				for (const { filename, hash, type, migration } of migrationList) {
					if (type !== "repo" || typeof migration !== "function") continue;
					this.logger?.info(`Running ${type} migration: ${filename}`);
					for (const repoName of allRepositoryNames) {
						await migration(db, this.schema(repoName));
					}
					await db.insert(Migration).values({ filename, hash, executedAt: new Date() });
				}
			}

			if (migrations.length === 0) {
				this.logger?.info("No new migrations to run.");
			}
		});
	}

	/**
	 * Creates a new repository on the server. This will create a new Postgres schema, including all tables.
	 *
	 * The repository name must only contain alphanumeric characters, dashes, and underscores. An error is thrown if the
	 * name contains any other characters, and if the schema already exists.
	 *
	 * @param repoName
	 */
	async createRepository(repoName: string) {
		if (!/^[a-zA-Z0-9-_]+$/.test(repoName)) {
			throw new Error("Invalid repo name");
		}

		const schemaName = this.schemaName(repoName);

		this.logger?.info(`Creating schema "${schemaName}" on Postgres.`);
		await this.db().transaction((db) => this.runSQLFile(db, INIT_REPO_SQL, repoName));
	}

	/**
	 * Deletes the repository `repoName` by dropping the Postgres schema.
	 *
	 * @param repoName
	 */
	async deleteRepository(repoName: string): Promise<void> {
		const schemaName = this.schemaName(repoName);

		await this.db().execute(sql.raw(`drop schema if exists "${schemaName}" cascade;`));
	}

	/**
	 * Closes all open database connections.
	 */
	async closeAll() {
		if (this._connection) {
			await this._connection.end();
			this._connection = undefined;
		}
	}

	public schemaName(repoName: string) {
		return `${this.repoPrefix}${repoName}`;
	}

	private async runSQLFile(db: DrizzleDb, sqlText: string, repoName?: string) {
		const schemaName = repoName ? this.schemaName(repoName) : undefined;
		if (schemaName) sqlText = sqlText.replaceAll(SQL_SCHEMA_PLACEHOLDER, schemaName);

		for (let statement of sqlText.split("--> statement-breakpoint")) {
			statement = statement.trim();
			if (statement.length === 0) continue;

			await db.execute(sql.raw(statement));
		}
	}

	private readonly repoPrefix = "repo_"; // repoPrefix = "r_v1_";
}

const schemataTable = pgSchema("information_schema").table("schemata", {
	schema_name: varchar("schema_name").notNull(),
});
