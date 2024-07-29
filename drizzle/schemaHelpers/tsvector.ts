import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm/sql/sql";

export function tsvector(fieldName: string, config: { sources: string[] }) {
	const sources = sql.raw(config.sources.join(" || ' ' || "));

	return customType<{ data: string }>({
		dataType() {
			return "tsvector";
		},
	})(fieldName, {
		dimensions: 3,
	}).generatedAlwaysAs((): SQL => sql`to_tsvector('simple', ${sources})`);
}
