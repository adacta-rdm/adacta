import assert from "node:assert";

import { assertDefined } from "@omegadot/assert";

import { decodeEntityId } from "../../../utils/decodeEntityId";
import type { IGraphQLContext } from "../../IGraphQLContext";
import type { IMetadata } from "../../generated/resolvers";

import type { IRepositorySettingId, IUserId } from "~/lib/database/Ids";
import type { ResolverReturnType } from "~/lib/utils/types";

export async function metadata(
	parent: { id: string },
	_: unknown,
	{ repositoryName, services: { el }, schema }: IGraphQLContext
): Promise<ResolverReturnType<IMetadata>> {
	assertDefined(repositoryName, "repositoryName not defined in metadata resolver");

	const { id } = parent;

	const entityName = decodeEntityId(id);

	const dbEntry = await el.one(schema[entityName], id);

	assert(
		"metadataCreatorId" in dbEntry,
		`metadata resolvers were invoked on a node that does not have metadata fields. Entity name: ${entityName}`
	);

	return {
		creator: {
			id: dbEntry.metadataCreatorId as IUserId,
		},
		creationTimestamp: dbEntry.metadataCreationTimestamp.toISOString(),
		origin: { remoteRepo: { id: repositoryName as IRepositorySettingId } },
		canEdit: true,
	};
}
