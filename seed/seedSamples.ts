/**
 * Sample batches and the samples cut from them.
 *
 * One file per batch in "seed/repo/<repository>/samples/", named for its key.
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
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { jsonFiles, readJson } from "~/seed/files.ts";

/**
 * One file in a repository's "samples/" directory.
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
 * Replace the sample batches of the bound repository with the ones in the seed
 * tree. Returns how many batches and samples were written.
 *
 * The rows are deleted first. The database then holds what the seed tree holds.
 * A batch whose file was removed therefore disappears on the next run.
 *
 * @throws Error if a batch names a preparer that no user file defines.
 */
export async function seedSamples(
	scope: ServiceContainer,
	repository: string,
	userIds: Map<string, string>,
): Promise<{ batches: number; samples: number }> {
	const db = scope.get(RepoDB);
	const creatorId = scope.get(Security).userId;
	const createdAt = new Date();

	db.delete(Sample).run();
	db.delete(SampleBatch).run();

	const files = jsonFiles("repo", repository, "samples");
	let samples = 0;

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
			db
				.select({ slug: SampleBatch.slug })
				.from(SampleBatch)
				.all()
				.map((batch) => batch.slug),
		);

		const { id: batchId } = db
			.insert(SampleBatch)
			.values({
				slug,
				name: seed.name,
				preparationDate: seed.preparationDate,
				preparedById,
				activeMaterial: seed.activeMaterial,
				support: seed.support,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			})
			.returning({ id: SampleBatch.id })
			.get();

		for (const name of seed.samples) {
			await addSample(db, {
				batchId,
				name,
				preparedById,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			});

			samples += 1;
		}
	}

	return { batches: files.length, samples };
}
