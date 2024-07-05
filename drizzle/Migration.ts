import type { DrizzleDb } from "~/drizzle/DrizzleDb";
import type { DrizzleGlobalSchema, DrizzleSchema } from "~/drizzle/DrizzleSchema";

export type Migration = IMigrationSQL | IMigrationScriptGlobal | IMigrationScriptRepo;

interface IMigrationSQL {
	filename: string;

	/**
	 * The sha256 hash of the .sql file.
	 */
	hash: string;
	type: "global" | "repo";
	migration: string;
}

interface IMigrationScriptGlobal {
	filename: string;

	/**
	 * The sha256 hash of the file containing the function.
	 */
	hash: string;

	type: "global";

	migration: (db: DrizzleDb, schema: DrizzleGlobalSchema) => Promise<unknown>;
}

interface IMigrationScriptRepo {
	filename: string;

	/**
	 * The sha256 hash of the file containing the function.
	 */
	hash: string;

	type: "repo";

	migration: (db: DrizzleDb, schema: DrizzleSchema) => Promise<unknown>;
}
