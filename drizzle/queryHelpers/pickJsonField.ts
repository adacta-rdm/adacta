import type { InferModelFromColumns } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core/columns";
import type { SQL } from "drizzle-orm/sql/sql";

export function pickJsonbField<
	K extends keyof InferModelFromColumns<{ $: T }>["$"],
	T extends PgColumn
>(column: T, field: K, cast?: "uuid"): SQL<InferModelFromColumns<{ $: T }>["$"][K]> {
	return sql`((${column}->${field})${cast ? sql.raw(`::${cast}`) : undefined})`;
}
