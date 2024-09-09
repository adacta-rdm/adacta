import { and, eq } from "drizzle-orm";

import type { AuthenticatedUserInfo } from "./AuthenticatedUserInfo";
import type { IGraphQLContext } from "./IGraphQLContext";
import type { RepositoryInfo } from "./RepositoryInfo";
import { DynamicNameComposition } from "./context/DynamicNameComposition";
import { RepositoryConfig } from "./context/RepositoryConfig";
import { ResourceAttachmentManager } from "./context/ResourceAttachmentManager";
import { ResourceManager } from "./context/ResourceManager";
import { SubscriptionPublisher } from "./context/SubscriptionPublisher";
import { AppConfig } from "../config/AppConfig";
import { CSVImportWizard } from "../csvImportWizard/CSVImportWizard";
import { EntityLoader } from "../services/EntityLoader";
import { IdPoolManager } from "../services/IdPoolManager";
import { RepositoryManagerPostgres } from "../services/RepositoryManagerPostgres";
import { Downsampling } from "../services/downsampler/Downsampling";
import { StorageEngineRemoteAccess } from "../storage/storageEngine/remoteAccess/StorageEngineRemoteAccess";

import { S3Config } from "~/apps/repo-server/src/config/S3Config";
import { REPO_UPLOAD_S3_PREFIX_DOWNSAMPLING } from "~/apps/repo-server/src/reposerverConfig";
import { ImagePreparation } from "~/apps/repo-server/src/services/ImagePreparation/ImagePreparation";
import { KeyValueDatabaseStorageEngineBackend } from "~/apps/repo-server/src/storage/keyValueDatabase/KeyValueDatabaseStorageEngineBackend";
import { S3RemoteAccess } from "~/apps/repo-server/src/storage/storageEngine/remoteAccess/S3RemoteAccess";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { DrizzleGlobalSchema } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import { Logger } from "~/lib/logger/Logger";
import { Service, ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";
import { S3StorageEngine, StorageEngine } from "~/lib/storage-engine";

/**
 * Creates dedicated per-request GraphQL context objects, ensuring that each repository gets its own DatabaseManager
 * instance.
 */
@Service(ServiceContainer)
export class ContextFactory {
	constructor(private services: ServiceContainer) {
		// Make sure SubscriptionPublisher is instantiated in the global ServiceContainer because the instance
		// needs to persist across requests.
		// Otherwise, each request would get a fresh instance, which breaks subscriptions.
		this.services.get(SubscriptionPublisher);
	}

	public constructRequestContext() {
		// Each request (and context) gets its own ServiceContainer.
		// Clone immediately so subsequent calls to `get` on the main ServiceContainer do not affect the context.
		const contextContainer = this.services.clone();

		// const logger = this.services.get(Logger).bind({ ...userInfo });
		let el: EntityLoader | undefined;
		return {
			getEntityLoader(): EntityLoader {
				if (!el) {
					const rmp = contextContainer.get(RepositoryManagerPostgres);
					el = contextContainer.set(new EntityLoader(rmp.db()));
				}

				return el;
			},
		};
	}

	public async constructGraphQLContext(
		userInfo: AuthenticatedUserInfo,
		repositoryInfo: RepositoryInfo | undefined
	): Promise<IGraphQLContext> {
		// Each request (and context) gets its own ServiceContainer.
		// Clone immediately so subsequent calls to `get` on the main ServiceContainer do not affect the context.
		const contextContainer = this.services.clone();

		const logger = this.services.get(Logger).bind({ ...userInfo });
		contextContainer.set(logger);
		contextContainer.set(userInfo);

		const rmp = this.services.get(RepositoryManagerPostgres);
		const drizzle = rmp.db();
		contextContainer.set(new EntityLoader(drizzle));
		let schema = new DrizzleGlobalSchema() as DrizzleSchema;

		// The ImagePreparation service is used to prepare images for display in the UI.
		// Since it contains a cache of already prepared images, it should not be reset for each
		// request. For this reason, it is accessed through the global ServiceContainer (which
		// ensures that the same instance is used for all requests).
		const image = this.services.get(ImagePreparation);

		const context: IGraphQLContext = {
			get schema() {
				return schema;
			},

			userId: userInfo.userId,

			repositoryName: repositoryInfo?.repositoryName,

			services: {
				get el() {
					return contextContainer.get(EntityLoader);
				},

				get ef() {
					return contextContainer.get(EntityFactory);
				},

				get ipm() {
					return contextContainer.get(IdPoolManager);
				},

				get rm() {
					return contextContainer.get(ResourceManager);
				},

				get ram() {
					return contextContainer.get(ResourceAttachmentManager);
				},

				get sto() {
					return contextContainer.get(StorageEngine);
				},

				get stoRemote() {
					return contextContainer.get(StorageEngineRemoteAccess);
				},

				get uiSubscriptionPublisher() {
					return contextContainer.get(SubscriptionPublisher);
				},

				get importWizard() {
					return contextContainer.get(CSVImportWizard);
				},

				get downsampling() {
					return contextContainer.get(Downsampling);
				},

				get logger() {
					return logger;
				},

				get appConfig() {
					return contextContainer.get(AppConfig);
				},

				get repoConfig() {
					return contextContainer.get(RepositoryConfig);
				},

				get nameComposition() {
					return contextContainer.get(DynamicNameComposition);
				},

				get drizzle() {
					return drizzle;
				},

				get image() {
					return image;
				},
			},

			// Sets up services that depend on the repository. This method exists because setting up these services
			// is asynchronous, but services that depend on them are instantiated synchronously. In addition, there
			// are a few requests which are not tied to a repository, in which case the entity manager and all other
			// dependent services are not available.
			setRepositoryInfo: async (info: RepositoryInfo) => {
				context.repositoryName = info.repositoryName;

				const { UserRepository } = schema as DrizzleGlobalSchema;

				// Check if the user has access to the repository
				const rows = await drizzle
					.select({ repo: UserRepository.repositoryName })
					.from(UserRepository)
					.where(
						and(
							eq(UserRepository.userId, userInfo.userId),
							eq(UserRepository.repositoryName, info.repositoryName)
						)
					);

				if (rows.length === 0) {
					throw new Error(`User does not have access to repository ${info.repositoryName}`);
				}

				contextContainer.set(info);

				contextContainer.configure(S3StorageEngine, () => {
					const s3Config = new S3Config({ prefix: info.repositoryName });
					return new S3StorageEngine(s3Config);
				});

				contextContainer.configure(S3RemoteAccess, [S3StorageEngine]);

				// KeyValueDatabaseStorageEngineBackend is currently only used for the downsampling cache. It can be removed when
				// downsampling is carried out in a separate microservice.
				contextContainer.configure(KeyValueDatabaseStorageEngineBackend, () => {
					const s3Config = new S3Config({ prefix: REPO_UPLOAD_S3_PREFIX_DOWNSAMPLING });
					const sto = new S3StorageEngine(s3Config);
					return new KeyValueDatabaseStorageEngineBackend(sto);
				});

				// Make the full repository-specific schema available in the context
				schema = contextContainer.set(rmp.schema(info.repositoryName));
			},
		};

		// EntityManager is instantiated asynchronously, so we need to do it here and pass it to the GraphQLContext.
		if (repositoryInfo) await context.setRepositoryInfo(repositoryInfo);

		return context;
	}
}
