import assert from "assert";

import { assertDefined } from "@omegadot/assert";

import { ResourceAttachmentManager } from "../context/ResourceAttachmentManager";
import type { IResolvers } from "../generated/resolvers";

export const ResourceImage: IResolvers["ResourceImage"] = {
	async dataURI({ id }, _, { services: { el, stoRemote }, schema: { Resource } }) {
		// Load resource
		const resource = await el.one(Resource, id);
		assert(resource.attachment.type === "Image");

		const path = ResourceAttachmentManager.getPath(resource);
		assertDefined(path);

		// Return Image URL
		return stoRemote.getDownloadLink(path);
	},

	async height({ id }, _, { services: { el }, schema: { Resource } }) {
		const resource = await el.one(Resource, id);
		assert(resource.attachment.type == "Image");

		return resource.attachment.height;
	},

	async width({ id }, _, { services: { el }, schema: { Resource } }) {
		const resource = await el.one(Resource, id);
		assert(resource.attachment.type == "Image");

		return resource.attachment.width;
	},
};
