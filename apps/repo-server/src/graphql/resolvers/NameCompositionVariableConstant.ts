import type { IResolvers } from "../generated/resolvers";

import { assertDefined } from "~/lib/assert/assertDefined";

export const NameCompositionVariableConstant: IResolvers["NameCompositionVariableConstant"] = {
	async value({ id }, _, { services: { el }, schema: { NameCompositionVariable } }) {
		const value = await el.one(NameCompositionVariable, id, "value");

		assertDefined(value, "Value is not defined on NameCompositionVariable of type Static");

		return value;
	},
};
