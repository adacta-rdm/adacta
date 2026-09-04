/**
 * The things that stand in a laboratory: rigs and equipment.
 *
 * One file per entry in "seed/repo/<repository>/inventory/", named for its key.
 * For example "micro-gc-490.json".
 *
 * An entry that has no fixed place omits "location". A spare part in a drawer
 * is such an entry.
 *
 * Slugs are not written by hand. An entry takes its slug from its name through
 * "availableSlug", which is what the application does. The seed therefore
 * cannot produce a slug the application could not produce.
 */
import { availableSlug } from "~/app/lib/slugs";
import { RepoDB } from "~/app/services/RepoDB";
import { Security } from "~/app/services/Security";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";
import { jsonFiles, readJson } from "~/seed/files";

/**
 * One file in a repository's "inventory/" directory.
 *
 * The identifiers are text because building and room codes are often
 * alphanumeric. For example a building may be called "B3".
 */
type SeedInventoryEntry = {
	name: string;
	kind: "rig" | "equipment";
	location?: {
		buildingIdentifier: string;
		roomIdentifier: string;
		label?: string;
	};
};

/**
 * Replace the inventory of the bound repository with the entries in the seed
 * tree. Returns how many entries were written.
 *
 * The rows are deleted first. The database then holds what the seed tree holds.
 * An entry whose file was removed therefore disappears on the next run.
 */
export function seedInventory(scope: ServiceContainer, repository: string): number {
	const db = scope.get(RepoDB);
	const creatorId = scope.get(Security).userId;
	const createdAt = new Date();

	db.delete(InventoryEntry).run();

	const files = jsonFiles("repo", repository, "inventory");
	if (files.length === 0) return 0;

	const entries = files.map((file) => readJson<SeedInventoryEntry>(file));

	// The table was emptied above, so the slugs taken so far are the ones handed
	// out in this loop. Two names that reduce to the same slug push the second
	// one to a numbered variant.
	const takenSlugs: string[] = [];

	const rows = entries.map((entry) => {
		const slug = availableSlug(entry.name, takenSlugs);
		takenSlugs.push(slug);

		return {
			slug,
			name: entry.name,
			kind: entry.kind,
			locationBuildingIdentifier: entry.location?.buildingIdentifier ?? null,
			locationRoomIdentifier: entry.location?.roomIdentifier ?? null,
			locationLabel: entry.location?.label ?? null,
			metadataCreatorId: creatorId,
			metadataCreationTimestamp: createdAt,
		};
	});

	db.insert(InventoryEntry).values(rows).run();

	return entries.length;
}
