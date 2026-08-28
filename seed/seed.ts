/**
 * Development seed.
 *
 * Goes through the same services the application uses: users are created with
 * Better Auth, repositories with RepoManager, and a repository is bound with
 * RepoAccess before its data is written. Nothing here reaches for a raw
 * database handle, so the seed exercises the real access path.
 *
 * Re-running clears the inventory of each repository and leaves the rest alone.
 * Run with "bun run db:seed".
 */
import { createAppContainer } from "~/app/createAppContainer.server";
import { BetterAuth } from "~/app/services/BetterAuth";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { RepoManager, RepositoryAlreadyExistsError } from "~/app/services/RepoManager";
import { Security } from "~/app/services/Security";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry";
import type { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";

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

const container = createAppContainer();
const manager = container.get(RepoManager);

manager.migrateAll();

const userId = await ensureUser(container);

for (const seed of repositories) {
	ensureRepository(manager, seed);
	manager.grantAccess(userId, seed.slug);

	writeInventory(scopeFor(container, userId, seed.slug), seed);

	console.log(`seeded ${seed.slug}: ${seed.entries.length} inventory entries`);
}

console.log(`user: ${USER.email} / ${USER.password}`);
console.log(`repositories: ${repositories.map((r) => r.slug).join(", ")}`);

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

function userIdOf(scope: ServiceContainer): string {
	return scope.get(Security).userId;
}
