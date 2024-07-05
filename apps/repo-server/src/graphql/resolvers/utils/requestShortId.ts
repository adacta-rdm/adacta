import type { IdPoolManager } from "../../../services/IdPoolManager";
import { base32 } from "../../../services/IdPoolManager";

import type { DrizzleDb } from "~/drizzle/DrizzleDb";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";

/**
 * Helper function to select the correct ID pool and request a new ID.
 * For now only a single pool is expected to exist.
 * If that single pool doesn't exist, it will be created with hardcoded defaults.
 * @param ctx
 */
export async function requestShortId(ctx: {
	drizzle: DrizzleDb;
	IdPool: DrizzleSchema["IdPool"];
	ipm: IdPoolManager;
}) {
	const { drizzle, ipm } = ctx;
	// Since there is at most one pool, we can safely get the first one. If it doesn't exist, create it.
	const pool =
		(await drizzle.select().from(ctx.IdPool).limit(1))[0] ??
		(await ipm.createIdPool({ alphabet: base32, digits: 4 }));

	return ipm.getNextId(pool);
}
