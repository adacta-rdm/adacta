import { asc } from "drizzle-orm";

import { paginateDocuments } from "./utils/paginateDocuments";
import type { IDefinedResolver } from "../IDefinedResolver";
import type { INameComposition, INameCompositionVariable } from "../generated/resolvers";

export const NameCompositionQuery: IDefinedResolver<"NameCompositionQuery"> = {
	async variables(_, __, { services: { el }, schema: { NameCompositionVariable } }) {
		const data = (await el.find(NameCompositionVariable, { orderBy: (e) => asc(e.name) })).map(
			(d) => ({ id: d.id })
		);

		return paginateDocuments<INameCompositionVariable>(data);
	},

	async composition(_, __, { services: { el }, schema: { NameComposition } }) {
		const data = (
			await el.find(NameComposition, {
				orderBy: (e) => asc(e.name),
			})
		).map((d) => ({ id: d.id, __typename: "NameComposition" as const }));

		return paginateDocuments<INameComposition>(data);
	},
};
