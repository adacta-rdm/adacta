import type { StorageEngine } from "@omegadot/storage-engine";

import { ResourceAttachmentManager } from "../graphql/context/ResourceAttachmentManager";
import type { ResourceManager } from "../graphql/context/ResourceManager";
import type { Downsampling } from "../services/downsampler/Downsampling";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { DrizzleEntity, DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IUserId } from "~/lib/database/Ids";
import type { ITransformationContext } from "~/lib/interface/ITransformationContext";
import type { Logger } from "~/lib/logger/Logger";

export function createTransformationContext(
	userId: IUserId,
	ram: ResourceAttachmentManager,
	rm: ResourceManager,
	downsampling: Downsampling,
	logger: Logger,
	el: EntityLoader,
	schema: DrizzleSchema,
	sto: StorageEngine
) {
	const context: ITransformationContext = {
		getUser: () => userId,
		getAttachmentPath: (resource) => ResourceAttachmentManager.getPath(resource),
		getAttachmentString: async (resource: DrizzleEntity<"Resource">) => {
			return ram.getRawText(resource);
		},
		getResourceManager: () => rm,
		getDownsampler: () => downsampling,
		getLogger: () => logger,
		getEntityLoader: () => el,
		getSchema: () => schema,
		getStorageEngine: () => sto,
	};
	return context;
}
