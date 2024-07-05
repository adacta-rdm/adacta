import assert from "node:assert";

import { count, eq } from "drizzle-orm";

import type { IResolvers } from "../generated/resolvers";

import type { IGraphQLContext } from "~/apps/repo-server/src/graphql/IGraphQLContext";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { INameCompositionVariableId } from "~/lib/database/Ids";

export async function NameCompositionVariableType(
	id: string,
	{ services: { el }, schema: { NameCompositionVariable } }: IGraphQLContext
) {
	const variable = await el.one(NameCompositionVariable, id as INameCompositionVariableId);

	if (variable.value) return "NameCompositionVariableConstant";
	if (variable.alias) return "NameCompositionVariableVariable";

	throw new Error("Unknown NameCompositionVariable type");
}

export const NameCompositionVariable: IResolvers["NameCompositionVariable"] = {
	async __resolveType({ id }, ctx) {
		return NameCompositionVariableType(id, ctx);
	},

	name({ id }, _, { services: { el }, schema: { NameCompositionVariable } }) {
		return el.one(NameCompositionVariable, id, "name");
	},

	async deletable({ id }, _, { services: { drizzle }, schema: { NameCompositionVariableUsage } }) {
		assert(isEntityId(id, "NameCompositionVariable"));

		const [{ c }] = await drizzle
			.select({ c: count(NameCompositionVariableUsage.variableId) })
			.from(NameCompositionVariableUsage)
			.where(eq(NameCompositionVariableUsage.variableId, id));

		return c === 0;
	},
};
