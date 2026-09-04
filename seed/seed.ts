/**
 * Development seed.
 *
 * This goes through the same services the application uses. Users are created
 * with Better Auth. Repositories are created with RepoManager. A repository is
 * bound with RepoAccess before its data is written. Nothing here reaches for a
 * raw database handle. The seed therefore exercises the real access path.
 *
 * Migrations run first. This works on an empty database directory. Running it
 * again on a populated one replaces the inventory, the sample batches, and the
 * samples of each repository. Users and repository records remain.
 *
 * Run with "bun run db:seed", or "bun run db:setup" to start from a wipe.
 */
import { BetterAuth } from "~/app/services/BetterAuth";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { RepoManager, RepositoryAlreadyExistsError } from "~/app/services/RepoManager";
import { Security } from "~/app/services/Security";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";
import { Sample } from "~/drizzle/schema/repo.Sample";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";

const USER = {
	name: "Test User",
	email: "dev@adacta.test",
	password: "password",
} as const;

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
	batches: BatchSeed[];
};

type BatchSeed = {
	slug: string;
	name: string;
	preparationDate: string;
	activeMaterial: string;
	support: string;
	sampleCount: number;
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
		batches: [
			{
				slug: "au-tio2-2025b",
				name: "Au/TiO2 (1 wt%) 2025-B",
				preparationDate: "2025-02-12",
				activeMaterial: "Au",
				support: "TiO2",
				sampleCount: 4,
			},
			{
				slug: "co-tio2-2025a",
				name: "Co/TiO2 (20 wt%) 2025-A",
				preparationDate: "2025-01-22",
				activeMaterial: "Co",
				support: "TiO2",
				sampleCount: 5,
			},
			{
				slug: "cu-zno-al2o3-2024a",
				name: "Cu/ZnO/Al2O3 (60:30:10) 2024-A",
				preparationDate: "2024-03-14",
				activeMaterial: "Cu",
				support: "ZnO/Al2O3",
				sampleCount: 5,
			},
			{
				slug: "h-zsm5-2024a",
				name: "H-ZSM-5 (Si/Al 25) 2024-A",
				preparationDate: "2024-04-09",
				activeMaterial: "H",
				support: "ZSM-5",
				sampleCount: 5,
			},
			{
				slug: "ni-al2o3-2024a",
				name: "Ni/Al2O3 (15 wt%) 2024-A",
				preparationDate: "2024-05-17",
				activeMaterial: "Ni",
				support: "Al2O3",
				sampleCount: 6,
			},
			{
				slug: "ni-sio2-2024b",
				name: "Ni/SiO2 (10 wt%) 2024-B",
				preparationDate: "2024-09-05",
				activeMaterial: "Ni",
				support: "SiO2",
				sampleCount: 4,
			},
			{
				slug: "pd-al2o3-2025a",
				name: "Pd/Al2O3 (0.03 wt%) 2025-A",
				preparationDate: "2025-03-11",
				activeMaterial: "Pd",
				support: "Al2O3",
				sampleCount: 3,
			},
			{
				slug: "pd-c-2024a",
				name: "Pd/C (5 wt%) 2024-A",
				preparationDate: "2024-06-21",
				activeMaterial: "Pd",
				support: "C",
				sampleCount: 6,
			},
			{
				slug: "pt-al2o3-2024a",
				name: "Pt/Al2O3 (2 wt%) 2024-A",
				preparationDate: "2024-08-30",
				activeMaterial: "Pt",
				support: "Al2O3",
				sampleCount: 7,
			},
			{
				slug: "pt-sn-al2o3-2025a",
				name: "Pt-Sn/Al2O3 (0.5-1 wt%) 2025-A",
				preparationDate: "2025-04-18",
				activeMaterial: "Pt-Sn",
				support: "Al2O3",
				sampleCount: 4,
			},
			{
				slug: "ru-k-c-2025a",
				name: "Ru-K/C (5 wt%) 2025-A",
				preparationDate: "2025-05-07",
				activeMaterial: "Ru-K",
				support: "C",
				sampleCount: 3,
			},
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
		batches: [],
	},
];

/**
 * Write the development fixtures into the databases of this container.
 */
export async function seedDatabase(container: ServiceContainer): Promise<void> {
	const manager = container.get(RepoManager);

	manager.migrateAll();

	const userId = await ensureUser(container);

	for (const seed of repositories) {
		ensureRepository(manager, seed);
		manager.grantAccess(userId, seed.slug);

		const scope = scopeFor(container, userId, seed.slug);
		writeInventory(scope, seed);
		writeSamples(scope, seed);

		console.log(
			`seeded ${seed.slug}: ${seed.entries.length} inventory entries, ${seed.batches.length} sample batches`,
		);
	}

	console.log(`user: ${USER.email} / ${USER.password}`);
	console.log(`repositories: ${repositories.map((r) => r.slug).join(", ")}`);
}

/**
 * Sign the seed user up through Better Auth, or find them if they exist.
 */
async function ensureUser(app: ServiceContainer): Promise<string> {
	const auth = app.get(BetterAuth);

	const response = await auth.api.signUpEmail({
		body: { name: USER.name, email: USER.email, password: USER.password },
		asResponse: true,
	});

	if (response.ok) {
		const { user } = (await response.json()) as { user: { id: string } };
		return user.id;
	}

	// The user was signed up on an earlier run. Sign in instead.
	const session = await auth.api.signInEmail({
		body: { email: USER.email, password: USER.password },
	});

	return session.user.id;
}

function ensureRepository(repoManager: RepoManager, seed: Seed): void {
	try {
		repoManager.createRepository(seed.slug, seed.name);
	} catch (error) {
		if (!(error instanceof RepositoryAlreadyExistsError)) throw error;
	}
}

/**
 * A request-like scope with the seed user authenticated and one repository
 * bound. RepoDatabase needs both to resolve.
 */
function scopeFor(app: ServiceContainer, userId: string, slug: string): ServiceContainer {
	const scope = app.clone();

	scope.get(Security).setCurrentUserId(userId);
	scope.get(RepoAccess).selectRepository(slug);

	return scope;
}

function writeInventory(scope: ServiceContainer, seed: Seed): void {
	const db = scope.get(RepoDB);
	const now = new Date();

	db.delete(InventoryEntry).run();

	db.insert(InventoryEntry)
		.values(
			seed.entries.map((entry) => ({
				name: entry.name,
				kind: entry.kind,
				locationBuildingIdentifier: entry.building ?? null,
				locationRoomIdentifier: entry.room ?? null,
				locationLabel: entry.label ?? null,
				metadataCreatorId: userIdOf(scope),
				metadataCreationTimestamp: now,
			})),
		)
		.run();
}

function writeSamples(scope: ServiceContainer, seed: Seed): void {
	const db = scope.get(RepoDB);
	const creatorId = userIdOf(scope);
	const createdAt = new Date();

	db.delete(Sample).run();
	db.delete(SampleBatch).run();

	for (const batch of seed.batches) {
		const { id: batchId } = db
			.insert(SampleBatch)
			.values({
				slug: batch.slug,
				name: batch.name,
				preparationDate: batch.preparationDate,
				preparedById: creatorId,
				activeMaterial: batch.activeMaterial,
				support: batch.support,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			})
			.returning({ id: SampleBatch.id })
			.get();

		const samples = Array.from({ length: batch.sampleCount }, (_, index) => ({
			batchId,
			slug: String(index + 1).padStart(2, "0"),
			name: `#${String(index + 1).padStart(2, "0")}`,
			preparedById: creatorId,
			metadataCreatorId: creatorId,
			metadataCreationTimestamp: createdAt,
		}));
		db.insert(Sample).values(samples).run();
	}
}

function userIdOf(scope: ServiceContainer): string {
	return scope.get(Security).userId;
}
