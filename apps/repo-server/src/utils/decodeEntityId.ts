import { decodeEntityIdHexCode } from "~/apps/repo-server/src/utils/decodeEntityIdHexCode";
import type { DrizzleEntityNameId } from "~/drizzle/DrizzleSchema";
import { entityByTypeId } from "~/drizzle/DrizzleSchema";

export function decodeEntityId<T extends string>(id: T): DrizzleEntityNameId {
	const entity = decodeEntityIdMaybe(id);

	if (!entity) {
		throw new Error(`Cannot decode entity type from id (type = ${id[16] + id[17]})`);
	}

	return entity;
}

function decodeEntityIdMaybe(id: string): DrizzleEntityNameId | undefined {
	const hex = decodeEntityIdHexCode(id);
	return (entityByTypeId as Record<number, DrizzleEntityNameId>)[hex];
}
