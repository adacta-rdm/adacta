import { DatabaseManager } from "~/app/services/DatabaseManager";
import { RepoAccess } from "~/app/services/RepoAccess";
import { service } from "~/lib/service-container/ServiceContainer";

/**
 * The database of the repository bound to this scope.
 *
 * Depends on RepoAccess. A repository database can therefore not be reached without
 * passing the access check.
 */
export const RepoDB = service(
	DatabaseManager,
	RepoAccess,
)((databases, access) => databases.repoDb(access.repository));

export type RepoDB = ReturnType<typeof RepoDB>;
