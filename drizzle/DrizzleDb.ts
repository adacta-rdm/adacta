import type { PgDatabase, QueryResultHKT } from "drizzle-orm/pg-core";

export type DrizzleDb = PgDatabase<QueryResultHKT>;
