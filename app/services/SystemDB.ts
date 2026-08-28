import { DatabaseManager } from "~/app/services/DatabaseManager";
import { service } from "~/lib/serviceContainer/ServiceContainer";

/**
 * Convenience: lets a service declare that it touches the system database.
 */
export const SystemDB = service(DatabaseManager)((databases) => databases.system());

export type SystemDB = ReturnType<typeof SystemDB>;
