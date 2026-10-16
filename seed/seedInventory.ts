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
import { eq } from "drizzle-orm";

import { availableSlug } from "~/app/lib/slugs.ts";
import { type BatchStatement, ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { Equipment } from "~/drizzle/schema/Equipment.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { Rig } from "~/drizzle/schema/Rig.ts";
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
	name?: string;
	kind: "rig" | "equipment";
	serialNumber?: string;
	product?: string;
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
	productIds: ReadonlyMap<string, number> = new Map(),
): Promise<Map<string, number>> {
	const db = scope.get(ApplicationDatabase);
	const creatorId = scope.get(Security).userId;
	const createdAt = new Date();

	const files = jsonFiles(seedPath("presets", preset, "inventory"));
	if (files.length === 0) return new Map();

	const entries = files.map((file) => readJson<SeedInventoryEntry>(file));

	// Each kind keeps the slugs handed out in this loop. Two names
	// that reduce to the same slug push the second one to a numbered variant.
	const takenSlugs: Record<"rig" | "equipment", string[]> = { rig: [], equipment: [] };

	const rows: { id: number; slug: string }[] = [];
	const statements: BatchStatement[] = [];
	for (const [index, entry] of entries.entries()) {
		const productId = entry.product === undefined ? undefined : productIds.get(entry.product);
		const product =
			productId === undefined
				? undefined
				: await db
						.select({ name: Product.name })
						.from(Product)
						.where(eq(Product.id, productId))
						.get();
		if (entry.kind === "equipment" && !product)
			throw new Error(`Equipment ${files[index]} needs an existing catalog product.`);
		const name = entry.kind === "rig" ? entry.name : product!.name;
		if (!name) throw new Error(`Rig ${files[index]} needs a name.`);
		const slug = availableSlug(name, takenSlugs[entry.kind]);
		takenSlugs[entry.kind].push(slug);
		const id = id53();
		rows.push({ id, slug });
		const values = {
			id,
			slug,
			locationBuildingIdentifier: entry.location?.buildingIdentifier ?? null,
			locationRoomIdentifier: entry.location?.roomIdentifier ?? null,
			locationLabel: entry.location?.label ?? null,
			metadataCreatorId: creatorId,
			metadataCreationTimestamp: createdAt,
		};
		if (entry.kind === "rig") {
			statements.push(db.insert(Id).values({ id }), db.insert(Rig).values({ ...values, name }));
		} else {
			statements.push(
				db.insert(Id).values({ id }),
				db
					.insert(Equipment)
					.values({ ...values, productId: productId!, serialNumber: entry.serialNumber ?? null }),
			);
		}
	}

	// Separate inserts avoid a large parameter list per statement.
	await db.batch(statements);

	return new Map(rows.map((row, index) => [keyOf(files[index]), row.id]));
}
