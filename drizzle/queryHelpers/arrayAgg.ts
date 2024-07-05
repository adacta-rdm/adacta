import type { AnyColumn, GetColumnData } from "drizzle-orm";
import { sql } from "drizzle-orm";

export function arrayAgg<TColumn extends AnyColumn>(column: TColumn) {
	return sql<
		GetColumnData<TColumn, "raw">[] | null
	>`array_agg(distinct ${sql`${column}`}) filter (where ${column} is not null)`;
}
