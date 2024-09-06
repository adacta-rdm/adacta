import assert from "assert";

import type { IResolvers } from "../generated/resolvers";

import { ResourceAttachmentManager } from "~/apps/repo-server/src/graphql/context/ResourceAttachmentManager";

export const ResourceImage: IResolvers["ResourceImage"] = {
	async dataURI({ id }, _, { services: { el, stoRemote }, schema: { Resource } }) {
		// Load resource
		const resource = await el.one(Resource, id);
		assert(resource.attachment.type === "Image");

		const path = ResourceAttachmentManager.getPath(resource);

		// Return Image URL
		return stoRemote.getDownloadLink(path);
	},

	async imageURI(
		{ id },
		{ preset },
		{ services: { el, sto, stoRemote, image }, schema: { Resource } }
	) {
		// Load resource
		const resource = await el.one(Resource, id);
		assert(resource.attachment.type === "Image");

		return image.getImage(resource, preset, sto, stoRemote);
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
