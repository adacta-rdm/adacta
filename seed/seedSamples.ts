/**
 * Sample batches and the samples cut from them.
 *
 * One file per batch in "seed/presets/<preset>/samples/", named for its key.
 * For example "pt-al2o3-2024a.json".
 *
 * Slugs are not written by hand. A batch takes its slug from its name through
 * "availableSlug", and a sample takes its slug from its label through
 * "addSample". Both are the calls a route makes when somebody adds a batch or a
 * sample by hand. The seed therefore cannot produce a slug the application
 * would not.
 */
import { addSample } from "~/app/lib/addSample.ts";
import { availableSlug } from "~/app/lib/slugs.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";
import { id53 } from "~/lib/id53/id53.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { jsonFiles, keyOf, readJson, seedPath } from "~/seed/files.ts";

/**
 * One file in a preset's "samples/" directory.
 *
 * `preparedBy` is a key from "seed/users/". The person who prepared the
 * material also prepared every sample cut from it.
 */
type SeedBatch = {
	name: string;
	preparationDate: string;
	preparedBy: string;
	activeMaterial: string;
	support: string;
	/**
	 * The labels of the samples cut from this batch. A batch prepared but not
	 * yet cut has none.
	 */
	samples: string[];
};

/**
 * Add the sample batches and samples from the preset to the database. Returns how many batches and samples were written.
 *
 * @throws Error if a batch names a preparer that no user file defines.
 */
export async function seedSamples(
	scope: ServiceContainer,
	preset: string,
	userIds: Map<string, string>,
): Promise<{ batches: number; samples: number; sampleIds: Map<string, number> }> {
	const db = scope.get(ApplicationDatabase);
	const creatorId = scope.get(Security).userId;
	const createdAt = new Date();

	const files = jsonFiles(seedPath("presets", preset, "samples"));
	let samples = 0;
	const sampleIds = new Map<string, number>();

	for (const file of files) {
		const seed = readJson<SeedBatch>(file);

		const preparedById = userIds.get(seed.preparedBy);
		if (preparedById === undefined) {
			throw new Error(`Unknown preparer "${seed.preparedBy}" in ${file}.`);
		}

		// The slug is taken from the name, as it is when a batch is created in the
		// application. Two names that reduce to the same slug push the second one
		// to a numbered variant.
		const slug = availableSlug(
			seed.name,
			(await db.select({ slug: SampleBatch.slug }).from(SampleBatch).all()).map(
				(batch) => batch.slug,
			),
		);

		const batchId = id53();
		await db.batch([
			db.insert(Id).values({ id: batchId }),
			db.insert(SampleBatch).values({
				id: batchId,
				slug,
				name: seed.name,
				preparationDate: seed.preparationDate,
				preparedById,
				activeMaterial: seed.activeMaterial,
				support: seed.support,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			}),
		]);

		for (const name of seed.samples) {
			const sample = await addSample(db, {
				batchId,
				name,
				preparedById,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			});
			sampleIds.set(`${keyOf(file)}/${name}`, sample.id);

			samples += 1;
		}
	}

	return { batches: files.length, samples, sampleIds };
}
