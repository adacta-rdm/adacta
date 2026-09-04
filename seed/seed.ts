/**
 * Development seed.
 *
 * This goes through the same services the application uses. Users are read from
 * "seed/users/" and created with Better Auth. Repositories are created with
 * RepoManager. A repository is bound with RepoAccess before its data is
 * written. Nothing here reaches for a raw database handle. The seed therefore
 * exercises the real access path.
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
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";
import { jsonFiles, keyOf, readJson } from "~/seed/files";
import { seedSamples } from "~/seed/seedSamples";

/**
 * The user whose name appears on every seeded record.
 *
 * The remaining fixtures are still literals in this file. They carry no author
 * of their own. Once they move to the seed tree, each one names its own
 * creator. This constant is then no longer needed.
 */
const CREATOR = "dev";

/**
 * One file in "seed/users/". The file name is the key. The file therefore holds
 * no key of its own.
 */
type SeedUser = {
	email: string;
	name: string;
	password: string;
};

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

/**
 * Write the development fixtures into the databases of this container.
 */
export async function seedDatabase(container: ServiceContainer): Promise<void> {
	const manager = container.get(RepoManager);

	manager.migrateAll();

	const userIds = await seedUsers(container);

	const creatorId = userIds.get(CREATOR);
	if (creatorId === undefined) throw new Error(`No user file named "${CREATOR}.json".`);

	for (const seed of repositories) {
		ensureRepository(manager, seed);

		// Everyone works in every repository. A development login is meant to
		// reach the whole fixture set.
		for (const userId of userIds.values()) manager.grantAccess(userId, seed.slug);

		const scope = scopeFor(container, creatorId, seed.slug);
		writeInventory(scope, seed);

		const { batches, samples } = await seedSamples(scope, seed.slug, userIds);

		console.log(
			`seeded ${seed.slug}: ${seed.entries.length} inventory entries, ` +
				`${batches} sample batches, ${samples} samples`,
		);
	}

	console.log(`repositories: ${repositories.map((r) => r.slug).join(", ")}`);
}

/**
 * Register every user in "seed/users/" and return their ids by key.
 *
 * The key is the file name without its extension. For example "dev.json"
 * becomes the key "dev". Later fixtures name their author by that key.
 */
async function seedUsers(app: ServiceContainer): Promise<Map<string, string>> {
	const auth = app.get(BetterAuth);

	const files = jsonFiles("users");
	if (files.length === 0) throw new Error("No user files in seed/users/.");

	const idsByKey = new Map<string, string>();

	for (const file of files) {
		const user = readJson<SeedUser>(file);
		const userId = await ensureUser(auth, user);

		idsByKey.set(keyOf(file), userId);

		console.log(`user: ${user.email} / ${user.password}`);
	}

	return idsByKey;
}

/**
 * Sign a seed user up through Better Auth, or find them if they exist.
 *
 * Sign-up goes through the server API rather than through an insert. The
 * password is therefore hashed the way a normal registration hashes it.
 */
async function ensureUser(auth: BetterAuth, user: SeedUser): Promise<string> {
	const response = await auth.api.signUpEmail({
		body: { name: user.name, email: user.email, password: user.password },
		asResponse: true,
	});

	if (response.ok) {
		const { user: created } = (await response.json()) as { user: { id: string } };
		return created.id;
	}

	// The user was signed up on an earlier run. Sign in instead.
	const session = await auth.api.signInEmail({
		body: { email: user.email, password: user.password },
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

function userIdOf(scope: ServiceContainer): string {
	return scope.get(Security).userId;
}
