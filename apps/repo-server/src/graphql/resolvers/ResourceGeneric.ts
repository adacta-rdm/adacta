import { ResourceAttachmentManager } from "../context/ResourceAttachmentManager";
import type { IResolvers } from "../generated/resolvers";

import { assertDefined } from "~/lib/assert/assertDefined";
import { RawTextReader } from "~/lib/rawTextReader/RawTextReader";

export const ResourceGeneric: IResolvers["ResourceGeneric"] = {
	// Only available on raw resources
	async uploadDeviceId({ id }, _, { services: { el }, schema: { Resource } }) {
		const resource = await el.one(Resource, id);
		if (resource.attachment.type === "Raw") {
			return resource.attachment.uploadDevice;
		}
		return null;
	},

	async downloadURL({ id }, _, { services: { el, stoRemote }, schema: { Resource } }) {
		const resource = await el.one(Resource, id);
		const path = ResourceAttachmentManager.getPath(resource);
		assertDefined(path);
		return stoRemote.getDownloadLink(path, resource.name);
	},

	async text({ id }, { start, end }, { services: { el, sto }, schema: { Resource } }) {
		const resource = await el.one(Resource, id);
		const path = ResourceAttachmentManager.getPath(resource);
		assertDefined(path);
		return new RawTextReader(path, sto).text(start, end);
	},
};
