import type { IResolvers } from "../generated/resolvers";

import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";

export const HasImageResource: IResolvers["HasImageResource"] = {
	__resolveType({ id }) {
		const type = decodeEntityId(id);

		if (type === "Device") return "Device";
		if (type === "DeviceDefinition") return "DeviceDefinition";
	},
};
