import { CONSTANT_NODE_IDS } from "./ConstantNodeIds";
import { decodeEntityId } from "../../utils/decodeEntityId";
import type { IResolvers } from "../generated/resolvers";

import { NameCompositionVariableType } from "~/apps/repo-server/src/graphql/resolvers/NameCompositionVariable";

export const Node: IResolvers["Node"] = {
	async __resolveType({ id }, ctx) {
		if (CONSTANT_NODE_IDS[id] !== undefined) {
			return CONSTANT_NODE_IDS[id].type;
		}

		const type = decodeEntityId(id);

		if (type === "NameCompositionVariable") {
			return NameCompositionVariableType(id, ctx);
		} else if (type === "Resource") {
			const resource = await ctx.services.el.one(ctx.schema.Resource, id, "attachment");
			switch (resource.type) {
				case "Raw":
					return "ResourceGeneric";
				case "TabularData":
					return "ResourceTabularData";
				case "Image":
					return "ResourceImage";
			}
		} else if (
			// TODO: Consider removing these entities from the return type of the
			//  decodeEntityId* functions?
			type === "IdPool" ||
			type === "SampleToSample"
		) {
			throw new Error(`${type} is not a Node`);
		}

		return type;
	},
};
