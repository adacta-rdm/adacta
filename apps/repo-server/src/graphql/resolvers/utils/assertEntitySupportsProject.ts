import assert from "assert";

import { decodeEntityId } from "~/apps/repo-server/src/utils/decodeEntityId";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";

// This function asserts that the given entity id reference an entity which supports links to
// projects (Resource, Device, or Sample)
// At the moment the narrowing of the "id" using the "asserts" keyword is not really useful/required
export function assertEntitySupportsProject(
	id: string
): asserts id is
	| DrizzleEntity<"Resource">["id"]
	| DrizzleEntity<"Device">["id"]
	| DrizzleEntity<"Sample">["id"] {
	const idType = decodeEntityId(id);
	if (!(idType === "Resource" || idType === "Device" || idType === "Sample")) {
		assert.fail(`${idType} does not implement Project interface`);
	}
}
