import type { Declaration } from "~/lib/tsrc/types/Declaration";
import type { ModulePath } from "~/lib/tsrc/types/ModulePath";

/**
 * The declarations and generated modules discovered in one TypeScript project.
 */
export interface ProjectScan {
	readonly declarationsByModule: ReadonlyMap<ModulePath, readonly Declaration[]>;
	readonly requestedModules: ReadonlySet<ModulePath>;
}
