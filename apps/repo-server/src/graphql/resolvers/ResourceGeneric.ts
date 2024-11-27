import assert from "assert";

import { ResourceAttachmentManager } from "../context/ResourceAttachmentManager";
import type { IResolvers } from "../generated/resolvers";

import { getFileTypeParser } from "~/apps/repo-server/src/transformations/FileTypeParser";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
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

	async rawFileMetadata({ id }, _, { services: { sto } }) {
		assert(isEntityId(id, "Resource"));
		const path = ResourceAttachmentManager.getPath(id);

		const previewLength = 10000;
		const data = await new RawTextReader(path, sto).text(0, previewLength);

		const type = await getFileTypeParser().fromBuffer(data.buffer);
		return { __typename: "ResourceMetadata", preview: data.text, type: type?.ext };
	},
};
