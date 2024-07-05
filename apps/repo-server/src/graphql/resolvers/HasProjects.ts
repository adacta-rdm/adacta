import { Resource } from "./Resource";
import type { IResolvers } from "../generated/resolvers";

import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";
import type { IDeviceId, IResourceId, ISampleId } from "~/lib/database/Ids";

export const HasProjects = {
	async __resolveType(parent: { id: IResourceId | ISampleId | IDeviceId }, ctx, info) {
		const type = decodeEntityId(parent.id);

		if (type === "Resource") {
			return Resource?.__resolveType({ ...parent, id: parent.id as IResourceId }, ctx, info);
		}

		return type;
	},
} as IResolvers["HasProjects"];
