import { join } from "node:path";
import { stdout } from "node:process";

import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { SqliteDatabaseManager } from "~/app/services/SqliteDatabaseManager.ts";
import { Env } from "~/lib/env/Env.ts";
import { Logger, logLevelFromName } from "~/lib/logger/Logger.ts";
import { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { FileSystemStorageEngine } from "~/lib/storage-engine/FileSystemStorageEngine.ts";

const root = createLocalAppContainer();

/** Creates an application container for a local request. */
export function createAppContainer(): ServiceContainer {
	return root.clone();
}

/** Creates a local application container with the supplied environment. */
export function createLocalAppContainer(env = new Env()): ServiceContainer {
	const container = new ServiceContainer();
	container.set(env);
	container.configure(SqliteDatabaseManager, (scope) => new SqliteDatabaseManager(scope.get(Env)));
	container.set(
		new Logger({
			level: logLevelFromName(env.string("ADACTA_LOG_LEVEL", "info")),
			stream: stdout,
		}),
	);

	const storageDirectory = env.path("ADACTA_STORAGE_DIR", ".adacta/storage");
	container.configure(
		FileSystemStorageEngine,
		(scope) =>
			new FileSystemStorageEngine(join(storageDirectory, scope.get(RepoAccess).repository)),
	);

	return container;
}
