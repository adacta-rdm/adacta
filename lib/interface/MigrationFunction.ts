import type { DrizzleDb } from "~/drizzle/DrizzleDb";
import type { DrizzleGlobalSchema, DrizzleSchema } from "~/drizzle/DrizzleSchema";

export type MigrationFunction = IMigrationFunctionGlobal | IMigrationFunctionRepo;

export interface IMigrationFunctionGlobal {
	(db: DrizzleDb, schema: DrizzleGlobalSchema): Promise<unknown>;
}

export interface IMigrationFunctionRepo {
	(db: DrizzleDb, schema: DrizzleSchema): Promise<unknown>;
}
