import type { IUserId } from "./Ids";

import { AuthenticatedUserInfo } from "~/apps/repo-server/src/graphql/AuthenticatedUserInfo";
import { entityId } from "~/apps/repo-server/src/utils/entityId";
import type { DrizzleEntity, DrizzleEntityNameId, Metadata } from "~/drizzle/DrizzleSchema";
import { entityByTypeId } from "~/drizzle/DrizzleSchema";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

@Service(AuthenticatedUserInfo)
export class EntityFactory {
	static id<T extends DrizzleEntityNameId>(e: T): DrizzleEntity<T>["id"] {
		const entry = Object.entries(entityByTypeId).find(([, v]) => v === e);
		if (!entry) throw new Error(`No entity with typeid ${e}`);
		return entityId(entry[0]) as DrizzleEntity<T>["id"];
	}

	static create<T extends "User", TProps extends EntityProps<"User">>(
		entityName: T,
		props: TProps
	): TProps & { id: DrizzleEntity<T>["id"] };
	static create<T extends DrizzleEntityNameId, TProps extends EntityProps<T>>(
		entityName: T,
		props: TProps,
		creatorId: IUserId
	): TProps & Metadata & { id: DrizzleEntity<T>["id"] };
	static create<T extends DrizzleEntityNameId, TProps extends EntityProps<T>>(
		entityName: T,
		props: TProps,
		creatorId?: IUserId
	) {
		const o = {
			...props,
			id: EntityFactory.id(entityName),
		};

		if (entityName === "User") return o;

		if (!creatorId) {
			throw new Error(`Missing required argument 'creatorId' for entity ${entityName}`);
		}

		return Object.assign(o, EntityFactory.metadata(creatorId));
	}

	constructor({ userId }: AuthenticatedUserInfo) {
		this.userId = userId;
	}

	create<T extends DrizzleEntityNameId, TProps extends EntityProps<T>>(
		entityName: T,
		props: TProps
	) {
		return EntityFactory.create(entityName, props, this.userId);
	}

	private userId: IUserId;

	private static metadata(metadataCreatorId: IUserId) {
		return {
			metadataCreatorId,
			metadataCreationTimestamp: new Date(),
			metadataDeletedAt: null,
		} satisfies Metadata;
	}
}

type EntityProps<T extends DrizzleEntityNameId> = Omit<
	DrizzleEntity<T>,
	// Remove the id/metadata fields as these are populated by the factory
	"metadataCreatorId" | "metadataCreationTimestamp" | "metadataDeletedAt" | "id"
>;
