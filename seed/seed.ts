/**
 * Registers every user in seed/users/ and loads one preset from seed/presets/.
 * For example, bun run db:setup pilot loads the pilot inventory and samples.
 * The setup command resets and migrates the database before loading these fixtures.
 */
import { BetterAuth } from "~/app/services/BetterAuth.ts";
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
 * The preset.json file names the fixture set for a reader.
 */
type SeedPreset = {
	name: string;
};

/**
 * Rejects an unknown preset and lists the available names.
 * Setup calls this before deleting the current database.
 */
export function assertPresetExists(preset: string): void {
	const available = subdirs(seedPath("presets"));

	if (!available.includes(preset)) {
		throw new Error(`Unknown preset "${preset}". Available presets: ${available.join(", ")}.`);
	}
}

/**
 * Write the selected preset and every seed user into the application database.
 */
export async function seedDatabase(container: ServiceContainer, preset = "demo"): Promise<void> {
	assertPresetExists(preset);
	const { name } = readJson<SeedPreset>(seedPath("presets", preset, "preset.json"));
	const userIds = await seedUsers(container);
	const creatorId = userIds.get(CREATOR);
	if (creatorId === undefined) throw new Error(`No user file named "${CREATOR}.json".`);

	const scope = container.clone();
	scope.get(Security).setCurrentUserId(creatorId);

	const catalog = await seedCatalog(scope, seedPath("presets", preset, "catalog"));
	const entryIds = await seedInventory(scope, preset, catalog.productIds);
	const { batches, samples, sampleIds } = await seedSamples(scope, preset, userIds);
	const diagrams = await seedPID(scope, preset, entryIds, sampleIds);

	console.log(
		`seeded ${preset} (${name}): ${entryIds.size} inventory entries, ${diagrams} diagrams, ` +
			`${batches} sample batches, ${samples} samples, ` +
			`${catalog.manufacturers} manufacturers, ${catalog.products} products ` +
			`(${catalog.specifications} specifications, ${catalog.channels} channels)`,
	);
}

/**
 * Register every user in "seed/users/" and return their ids by key.
 *
 * The key is the file name without its extension. For example "dev.json"
 * becomes the key "dev". Later fixtures name their author by that key.
 */
async function seedUsers(app: ServiceContainer): Promise<Map<string, string>> {
	const auth = app.get(BetterAuth);

	const files = jsonFiles(seedPath("users"));
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
