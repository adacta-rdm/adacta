/**
 * Seed script.
 *
 * Creates two repositories and fills each with inventory. Safe to re-run: it
 * clears the tables first. Run with "bun run db:seed".
 */
import { getGlobalDb, getRepoDb } from "~/app/db/connect.server";
import { Repository } from "~/drizzle/schema/global.Repository";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";

type Seed = {
	slug: string;
	name: string;
	entries: {
		name: string;
		kind: "rig" | "equipment";
		building?: string;
		room?: string;
		label?: string;
	}[];
};

const repositories: Seed[] = [
	{
		slug: "demo",
		name: "Demo Laboratory",
		entries: [
			{ name: "Ammonia Synthesis Rig", kind: "rig", building: "B3", room: "101", label: "Bench 2" },
			{ name: "SO2 Oxidation Rig", kind: "rig", building: "B3", room: "101" },
			{ name: "Analytical Balance XS205", kind: "equipment", building: "B3", room: "102" },
			{ name: "Micro GC 490", kind: "equipment", building: "B3", room: "102", label: "Cabinet A" },
			{ name: "Methanation Test Stand", kind: "rig", building: "B7", room: "12" },
			{ name: "Mass Flow Controller (spare)", kind: "equipment" },
		],
	},
	{
		slug: "pilot",
		name: "Pilot Plant",
		entries: [
			{ name: "Fischer-Tropsch Loop", kind: "rig", building: "H1", room: "Hall" },
			{ name: "Steam Reformer", kind: "rig", building: "H1", room: "Hall", label: "North bay" },
			{ name: "Gas Chromatograph 8890", kind: "equipment", building: "H1", room: "204" },
		],
	},
];

const now = new Date();
const globalDb = getGlobalDb();

globalDb.delete(Repository).run();

for (const seed of repositories) {
	globalDb.insert(Repository).values({ slug: seed.slug, name: seed.name, createdAt: now }).run();

	const repoDb = getRepoDb(seed.slug);
	repoDb.delete(InventoryEntry).run();

	repoDb
		.insert(InventoryEntry)
		.values(
			seed.entries.map((entry) => ({
				name: entry.name,
				kind: entry.kind,
				locationBuildingIdentifier: entry.building ?? null,
				locationRoomIdentifier: entry.room ?? null,
				locationLabel: entry.label ?? null,
				metadataCreationTimestamp: now,
			})),
		)
		.run();

	console.log(`seeded ${seed.slug}: ${seed.entries.length} inventory entries`);
}

console.log(`repositories: ${repositories.map((r) => r.slug).join(", ")}`);
