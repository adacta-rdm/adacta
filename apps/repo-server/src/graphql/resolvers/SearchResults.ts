import { and, isNull, sql } from "drizzle-orm";
import { union } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm/sql/sql";

import type { EntityLoader } from "../../services/EntityLoader";
import type { IResolvers } from "../generated/resolvers";

import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";

export const SearchResults: IResolvers["SearchResults"] = {
	// Do not destruct the `services` object here, as not all services are guaranteed to be available.
	async search(
		_,
		vars,
		{ repositoryName, services, schema: { Device, Sample, Resource, Project } }
	) {
		if (!repositoryName) {
			return [];
		}

		const el = services.el;
		const tsQuery = preProcessQuery(vars.query);

		const deviceResults = query(el, tsQuery, Device);
		const sampleResults = query(el, tsQuery, Sample);
		const resourceResults = query(el, tsQuery, Resource);
		const projectResults = query(el, tsQuery, Project);

		const resultQuery = await union(
			deviceResults,
			sampleResults,
			resourceResults,
			projectResults
		).limit(10);

		const results = [...resultQuery];

		return results.map((r) => ({
			repositoryId: repositoryName,
			node: { id: r.id },
		}));
	},
};

function preProcessQuery(query: string) {
	// NOTE: There is a postgres function called `websearch_to_tsquery` that could be used here,
	// but it does not support partial words, so we have to build the query manually.
	const parts = `"${query
		.split(" ")
		.map((s) => `"${s}":*`) // Make each word a wildcard
		.join(" & ")}`; // Combine words with AND

	return sql`to_tsquery(${parts})`;
}
function query<T extends "Resource" | "Sample" | "Device" | "Project">(
	el: EntityLoader,
	tsQuery: SQL<unknown>,
	Entity: DrizzleSchema[T]
) {
	return el.drizzle
		.select({
			id: Entity.id,
			name: Entity.name, // DEBUG
			rank: sql`ts_rank_cd(search, ${tsQuery}, 32)`,
		})
		.from(Entity)
		.where(and(sql`search @@ ${tsQuery}`, isNull(Entity.metadataDeletedAt)));
}
