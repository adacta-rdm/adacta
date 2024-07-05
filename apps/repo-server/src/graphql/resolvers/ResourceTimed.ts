import assert from "assert";

import { assertDefined, assertUnreachable } from "@omegadot/assert";

import type { IResolvers } from "../generated/resolvers";

import type { IResourceId } from "~/lib/database/Ids";

export const ResourceTimed: IResolvers["ResourceTimed"] = {
	async __resolveType({ id }: { id: IResourceId }, { services: { el }, schema: { Resource } }) {
		const resource = await el.one(Resource, id);
		const kind = resource.attachment.type;

		switch (kind) {
			case "Raw":
				return "ResourceGeneric";
			case "TabularData":
				return "ResourceTabularData";
			case "Image":
				throw new Error("We shouldn't get here");
		}

		assertUnreachable(kind);
	},

	async begin({ id }, _, { services: { el }, schema: { Resource } }) {
		const { attachment } = await el.one(Resource, id);
		assert(attachment.type !== "Image");
		return attachment.begin;
	},

	async end({ id }, _, { services: { el }, schema: { Resource } }) {
		assertDefined(id);
		const { attachment } = await el.one(Resource, id);
		assert(attachment.type !== "Image");
		return attachment.end;
	},
};
