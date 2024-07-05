import { assertDefined } from "@omegadot/assert";

import type { IResolvers } from "../generated/resolvers";

export const NameCompositionVariableVariable: IResolvers["NameCompositionVariableVariable"] = {
	async alias({ id }, _, { services: { el }, schema: { NameCompositionVariable } }) {
		const variable = await el.one(NameCompositionVariable, id);

		assertDefined(
			variable.alias,
			"Alias is not defined on NameCompositionVariable of type Variable"
		);

		return variable.alias;
	},

	prefix({ id }, _, { services: { el }, schema: { NameCompositionVariable } }) {
		return el.one(NameCompositionVariable, id, "prefix");
	},

	suffix({ id }, _, { services: { el }, schema: { NameCompositionVariable } }) {
		return el.one(NameCompositionVariable, id, "suffix");
	},
};
