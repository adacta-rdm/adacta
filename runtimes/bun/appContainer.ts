import { stdout } from "node:process";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Env } from "~/lib/env/Env.ts";
import { Logger, logLevelFromName } from "~/lib/logger/Logger.ts";
import { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { FileSystemStorageEngine } from "~/runtimes/bun/lib/FileSystemStorageEngine.ts";
import {
	applicationDatabase,
	openSqliteDatabase,
	sqliteDatabasePath,
} from "~/runtimes/bun/sqliteDatabase.ts";

const root = createBunAppContainer();

/**
 * Creates an application container for one request.
 */
export function createAppContainer(): ServiceContainer {
	return root.clone();
}

/**
 * Creates the root container of the Bun runtime with the supplied environment.
 */
export function createBunAppContainer(env = new Env()): ServiceContainer {
	const container = new ServiceContainer();
	container.set(env);

	// Every request uses the same file. Hence, the root container keeps one
	// connection for the life of the process and shares it with request scopes.
	let database: ApplicationDatabase | undefined;
	const connection = () =>
		(database ??= applicationDatabase(openSqliteDatabase(sqliteDatabasePath(env))));
	container.configure(ApplicationDatabase, connection);

	container.set(
		new Logger({
			level: logLevelFromName(env.string("ADACTA_LOG_LEVEL", "info")),
			stream: stdout,
		}),
	);

	const storageDirectory = env.path("ADACTA_STORAGE_DIR", ".adacta/storage");
	container.configure(FileSystemStorageEngine, () => new FileSystemStorageEngine(storageDirectory));

	return container;
}
