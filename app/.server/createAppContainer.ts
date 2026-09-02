import { join } from "node:path";
import { stdout } from "node:process";

import { RepoAccess } from "~/app/services/RepoAccess";
import { Env } from "~/lib/env/Env";
import { Logger, logLevelFromName } from "~/lib/logger/Logger";
import { ServiceContainer } from "~/lib/service-container/ServiceContainer";
import { FileSystemStorageEngine } from "~/lib/storage-engine/FileSystemStorageEngine";

/**
 * The process-wide container. Request scopes are clones of it. A service
 * resolved during one request is therefore not shared with the next.
 *
 * Environment values are read once, here, and injected as a service. Nothing
 * below this point reads process.env directly. Services can therefore be
 * tested with a fabricated environment.
 */
export function createAppContainer(env = new Env()): ServiceContainer {
	const container = new ServiceContainer();
	container.set(env);

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
