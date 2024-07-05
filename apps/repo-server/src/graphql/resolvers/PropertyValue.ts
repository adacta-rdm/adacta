import type { IResolvers } from "../generated/resolvers";

import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";

export const PropertyValue: IResolvers["PropertyValue"] = {
	__resolveType({ id }) {
		const type = decodeEntityId(id);

		switch (type) {
			case "Device":
				return "Device";
			case "Sample":
				return "Sample";
			default:
				throw new Error("Implement __resolveType case.");
		}
	},
};
