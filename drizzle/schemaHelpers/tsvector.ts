import { sql } from "drizzle-orm";
import { customType } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm/sql/sql";

export function tsvector(fieldName: string, config: { sources: string[] }) {
	const sources = sql.raw(
		// - coalesce all sources to avoid null values
		// - concatenate all sources with ' ' as separator
		config.sources.map((columnName) => `coalesce(${columnName}, '')`).join(" || ' ' || ")
	);

	return customType<{ data: string }>({
		dataType() {
			return "tsvector";
		},
	})(fieldName).generatedAlwaysAs((): SQL => sql`to_tsvector('simple', ${sources})`);
}
