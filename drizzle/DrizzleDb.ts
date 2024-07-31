import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";

export type DrizzleDb = PgDatabase<PgQueryResultHKT>;
