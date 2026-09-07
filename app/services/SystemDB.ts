import { DatabaseManager } from "~/app/services/DatabaseManager.ts";
import { service } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Convenience: lets a service declare that it touches the system database.
 */
export const SystemDB = service(DatabaseManager)((databases) => databases.system());

export type SystemDB = ReturnType<typeof SystemDB>;
