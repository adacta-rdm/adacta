import { customType } from "drizzle-orm/pg-core";

// TODO: This custom type is used to create a tsvector column in a table.
//  For better performance there should be a GIN index on the tsvector column.
//  Right now this index type is not supported by drizzle-kit but should be coming soon
//  See: https://github.com/drizzle-team/drizzle-orm/issues/247

export const tsvector = customType<{
	data: string;
	config: { sources: string[] };
}>({
	dataType(config) {
		if (config) {
			const sources = config.sources.join(" || ' ' || ");
			return `tsvector generated always as (to_tsvector('simple', ${sources})) stored`;
		} else {
			return `tsvector`;
		}
	},
});
