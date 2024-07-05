import type { PgSchema } from "drizzle-orm/pg-core";

export interface IPgSchemas {
	global: PgSchema;
	repo: PgSchema;
}
