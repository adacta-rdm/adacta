/**
 * The things that stand in a laboratory: rigs and equipment.
 *
 * One file per entry in "seed/presets/<preset>/inventory/", named for its key.
 * For example "micro-gc-490.json".
 *
 * An entry that has no fixed place omits "location". A spare part in a drawer
 * is such an entry.
 *
 * Slugs are not written by hand. An entry takes its slug from its name through
 * "availableSlug", which is what the application does. The seed therefore
 * cannot produce a slug the application could not produce.
 */
import { availableSlug } from "~/app/lib/slugs.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { id53 } from "~/lib/id53/id53.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { jsonFiles, keyOf, readJson, seedPath } from "~/seed/files.ts";

/**
 * One file in a preset's "inventory/" directory.
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
 * Add the inventory entries from the seed tree to the database.
 * Returns the id of each entry, indexed by the key of its file.
 *
 * A later fixture names an entry by that key. For example, the P&ID file
 * "methanation-test-stand.json" describes the entry with the key
 * "methanation-test-stand".
 */
export async function seedInventory(
	scope: ServiceContainer,
	preset: string,
): Promise<Map<string, number>> {
	const db = scope.get(ApplicationDatabase);
	const creatorId = scope.get(Security).userId;
	const createdAt = new Date();

	const files = jsonFiles(seedPath("presets", preset, "inventory"));
	if (files.length === 0) return new Map();

	const entries = files.map((file) => readJson<SeedInventoryEntry>(file));

	// The slugs taken so far are the ones handed out in this loop. Two names
	// that reduce to the same slug push the second one to a numbered variant.
	const takenSlugs: string[] = [];

	const rows = entries.map((entry) => {
		const slug = availableSlug(entry.name, takenSlugs);
		takenSlugs.push(slug);

		return {
			id: id53(),
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

	await db.batch([
		db.insert(Id).values(rows.map(({ id }) => ({ id }))),
		db.insert(InventoryEntry).values(rows),
	]);

	return new Map(rows.map((row, index) => [keyOf(files[index]), row.id]));
}
