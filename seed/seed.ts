/**
 * Development seed.
 *
 * Everything written here comes from the "seed/" tree. Users are read from
 * "seed/users/" and created with Better Auth. Each subdirectory of "seed/repo/"
 * is one repository, created with RepoManager and bound with RepoAccess before
 * its data is written. Nothing here reaches for a raw database handle. The seed
 * therefore exercises the real access path.
 *
 * db:setup resets the databases and applies migrations before loading this
 * seed. All users, repositories, and fixtures are created in empty databases.
 *
 * Run with "bun run db:setup".
 */
import { BetterAuth } from "~/app/services/BetterAuth.ts";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { Security } from "~/app/services/Security.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { jsonFiles, keyOf, readJson, seedPath, subdirs } from "~/seed/files.ts";
import { seedCatalog } from "~/seed/seedCatalog.ts";
import { seedInventory } from "~/seed/seedInventory.ts";
import { seedPID } from "~/seed/seedPID.ts";
import { seedSamples } from "~/seed/seedSamples.ts";

/**
 * The user recorded as the creator of every seeded record.
 *
 * A seed file describes a thing in the laboratory. It does not say who typed it
 * into Adacta. One development user therefore stands as the author of the whole
 * fixture set. A batch still names the person who prepared it, which is a fact
 * about the material rather than about the record.
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

/**
 * The "repository.json" of one repository directory. The directory name is
 * the slug, so the file carries only what the slug cannot say.
 */
type SeedRepository = {
	name: string;
};

/**
 * Write the development fixtures into the databases of this container.
 */
export async function seedDatabase(container: ServiceContainer): Promise<void> {
	const manager = container.get(RepoManager);

	const userIds = await seedUsers(container);

	const creatorId = userIds.get(CREATOR);
	if (creatorId === undefined) throw new Error(`No user file named "${CREATOR}.json".`);

	const slugs = subdirs("repo");
	if (slugs.length === 0) throw new Error("No repository directories in seed/repo/.");

	for (const slug of slugs) {
		await createRepository(manager, slug);

		// Everyone works in every repository. A development login is meant to
		// reach the whole fixture set.
		for (const userId of userIds.values()) await manager.grantAccess(userId, slug);

		const scope = await scopeFor(container, creatorId, slug);

		const entryIds = await seedInventory(scope, slug);
		const diagrams = await seedPID(scope, slug, entryIds);
		const { batches, samples } = await seedSamples(scope, slug, userIds);

		const catalog = await seedCatalog(scope, slug);

		console.log(
			`seeded ${slug}: ${entryIds.size} inventory entries, ${diagrams} diagrams, ` +
				`${batches} sample batches, ${samples} samples, ` +
				`${catalog.manufacturers} manufacturers, ${catalog.products} products ` +
				`(${catalog.specifications} specifications, ${catalog.channels} channels)`,
		);
	}

	console.log(`repositories: ${slugs.join(", ")}`);
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
		const userId = await createUser(auth, user);

		idsByKey.set(keyOf(file), userId);

		console.log(`user: ${user.email} / ${user.password}`);
	}

	return idsByKey;
}

/**
 * Sign a seed user up through Better Auth.
 *
 * Sign-up goes through the server API rather than through an insert. The
 * password is therefore hashed the way a normal registration hashes it.
 */
async function createUser(auth: BetterAuth, user: SeedUser): Promise<string> {
	const response = await auth.api.signUpEmail({
		body: { name: user.name, email: user.email, password: user.password },
		asResponse: true,
	});

	if (!response.ok)
		throw new Error(`Could not create seed user "${user.email}": ${response.status}.`);

	const { user: created } = (await response.json()) as { user: { id: string } };
	return created.id;
}

/**
 * Create the repository. The directory name is the slug. The display name
 * comes from that directory's "repository.json".
 */
async function createRepository(manager: RepoManager, slug: string): Promise<void> {
	const { name } = readJson<SeedRepository>(seedPath("repo", slug, "repository.json"));

	await manager.createRepository(slug, name);
}

/**
 * A request-like scope with the seed user authenticated and one repository
 * bound. RepoDB needs both before it resolves.
 */
async function scopeFor(
	app: ServiceContainer,
	userId: string,
	slug: string,
): Promise<ServiceContainer> {
	const scope = app.clone();

	scope.get(Security).setCurrentUserId(userId);
	await scope.get(RepoAccess).selectRepository(slug);

	return scope;
}
