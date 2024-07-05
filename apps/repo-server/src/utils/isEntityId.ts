import { decodeEntityIdHexCode } from "~/apps/repo-server/src/utils/decodeEntityIdHexCode";
import type { DrizzleEntity, DrizzleEntityNameId } from "~/drizzle/DrizzleSchema";
import { entityByTypeId } from "~/drizzle/DrizzleSchema";

/**
 * Check each ID in the provided array is a valid entity ID for any of the provided entity names.
 *
 * @param id
 * @param entityNames
 */
export function isEntityId<T extends DrizzleEntityNameId[]>(
	id: unknown[],
	...entityNames: T
): id is DrizzleEntity<T[number]>["id"][];

/**
 * Check if the given ID is a valid entity ID for any of the provided entity names.
 *
 * @param id
 * @param entityNames
 */
export function isEntityId<T extends DrizzleEntityNameId[]>(
	id: unknown,
	...entityNames: T
): id is DrizzleEntity<T[number]>["id"];

export function isEntityId<T extends DrizzleEntityNameId[]>(
	id: unknown | unknown[],
	...entityNames: T
): boolean {
	if (Array.isArray(id)) return id.every((id) => isEntityId(id, ...entityNames));

	if (typeof id !== "string") return false;

	try {
		const hex = decodeEntityIdHexCode(id);

		for (const name of entityNames) {
			if ((entityByTypeId as Record<string, DrizzleEntityNameId>)[hex] === name) return true;
		}
		return false;
	} catch (e) {
		return false;
	}
}
