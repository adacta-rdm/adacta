import type { RepositoryInfo } from "./RepositoryInfo";
import type { DynamicNameComposition } from "./context/DynamicNameComposition";
import type { RepositoryConfig } from "./context/RepositoryConfig";
import type { ResourceAttachmentManager } from "./context/ResourceAttachmentManager";
import type { ResourceManager } from "./context/ResourceManager";
import type { SubscriptionPublisher } from "./context/SubscriptionPublisher";
import type { AppConfig } from "../config/AppConfig";
import type { CSVImportWizard } from "../csvImportWizard/CSVImportWizard";
import type { EntityLoader } from "../services/EntityLoader";
import type { IdPoolManager } from "../services/IdPoolManager";
import type { Downsampling } from "../services/downsampler/Downsampling";
import type { StorageEngineRemoteAccess } from "../storage/storageEngine/remoteAccess/StorageEngineRemoteAccess";

import type { ImagePreparation } from "~/apps/repo-server/src/services/ImagePreparation";
import type { DrizzleDb } from "~/drizzle/DrizzleDb";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import type { EntityFactory } from "~/lib/database/EntityFactory";
import type { IUserId } from "~/lib/database/Ids";
import type { Logger } from "~/lib/logger/Logger";
import type { StorageEngine } from "~/lib/storage-engine";

export interface IGraphQLContext {
	// Services are implemented as getters so that they can be instantiated on demand. However, ApolloServer performs a
	// shallow copy of the context object for each request, which would effectively instantiate all services for every
	// request if they weren't in an inner object.
	services: {
		el: EntityLoader;
		drizzle: DrizzleDb;

		ef: EntityFactory;

		rm: ResourceManager;
		ram: ResourceAttachmentManager;
		sto: StorageEngine;
		stoRemote: StorageEngineRemoteAccess;
		uiSubscriptionPublisher: SubscriptionPublisher;
		importWizard: CSVImportWizard;
		downsampling: Downsampling;
		logger: Logger;
		appConfig: AppConfig;

		repoConfig: RepositoryConfig;

		ipm: IdPoolManager;

		nameComposition: DynamicNameComposition;

		image: ImagePreparation;
	};
	schema: DrizzleSchema;

	userId: IUserId;
	repositoryName: string | undefined;

	setRepositoryInfo: (info: RepositoryInfo) => Promise<void>;
}
