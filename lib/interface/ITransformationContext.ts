import type { ResourceManager } from "~/apps/repo-server/src/graphql/context/ResourceManager";
import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import type { Downsampling } from "~/apps/repo-server/src/services/downsampler/Downsampling";
import type { DrizzleEntity, DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { IUserId } from "~/lib/database/Ids";
import type { Logger } from "~/lib/logger/Logger";
import type { StorageEngine } from "~/lib/storage-engine";

export interface ITransformationContext {
	getAttachmentString(resource: DrizzleEntity<"Resource">): Promise<string>;

	getAttachmentPath(resource: DrizzleEntity<"Resource">): string;

	getResourceManager(): ResourceManager;

	getUser(): IUserId;

	getDownsampler(): Downsampling;

	getLogger(): Logger;

	getEntityLoader(): EntityLoader;

	getStorageEngine(): StorageEngine;

	getSchema(): DrizzleSchema;
}
