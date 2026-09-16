/**
 * Adding and deleting the samples of one batch.
 *
 * Two pages offer this. The batch page has a sample table, and the batch list
 * shows the same table inside the open row. The rules live here, so the two
 * pages cannot drift apart.
 *
 * A deleted sample is removed for good. A sample is deleted only while nothing
 * else refers to it. A sample that has been used is archived instead.
 */
import { and, eq, isNull } from "drizzle-orm";

import { addSample } from "~/app/lib/addSample.ts";
import { EntityAlreadyExistsError } from "~/app/lib/error/EntityAlreadyExistsError.ts";
import { SlugAllocationError } from "~/app/lib/error/SlugAllocationError.ts";
import type { RepoDB } from "~/app/services/RepoDB.ts";
import type { Entity } from "~/drizzle/Schema.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import type { FormValues } from "~/lib/form-values/FormValues.ts";
import type { Logger } from "~/lib/logger/Logger.ts";

export type SampleErrors = Partial<Record<"form" | "name" | "preparedById", string>>;

/**
 * What a page has to supply before a sample can be added. The route reads
 * these from the service container. This module therefore stays out of the
 * container and out of the request.
 */
export interface SampleContext {
	db: RepoDB;
	logger: Logger;

	/** Everyone who may open this repository. */
	preparerIds: readonly string[];

	/** Who is adding the sample. */
	creatorId: string;

	/** The repository slug, named in the log when a slug cannot be allocated. */
	repository: string;
}

/**
 * Add the submitted sample to the batch. Returns nothing when the sample was
 * written, and the messages for the person at the form otherwise.
 */
export async function addSubmittedSample(
	context: SampleContext,
	batch: Entity<"SampleBatch">,
	values: FormValues,
): Promise<SampleErrors | undefined> {
	const errors: SampleErrors = {};
	const name = values.string("name");

	// A blank box means the sample was prepared by whoever prepared the batch.
	const preparedById = values.string("preparedById", batch.preparedById);

	if (!name) errors.name = "A sample name is required.";

	if (!context.preparerIds.includes(preparedById)) {
		errors.preparedById = "The selected preparer cannot access this repository.";
	}

	if (Object.keys(errors).length > 0) return errors;

	try {
		await addSample(context.db, {
			batchId: batch.id,
			name,
			preparedById,
			metadataCreatorId: context.creatorId,
			metadataCreationTimestamp: new Date(),
		});
	} catch (error) {
		if (error instanceof EntityAlreadyExistsError) {
			return { name: `This batch already contains a sample named "${name}".` };
		}

		if (error instanceof SlugAllocationError) {
			context.logger
				.bind({
					event: "sample_slug_allocation_failed",
					repository: context.repository,
					batchId: batch.id,
					sampleName: name,
					baseSlug: error.base,
					attempts: error.attempts,
				})
				.error(error.message);

			return {
				name: "A URL identifier could not be created for this sample. Choose a name that differs by more than punctuation.",
			};
		}

		throw error;
	}

	return undefined;
}

/**
 * Delete one sample of the batch.
 *
 * @throws Response 404 when the sample is not there, or is archived.
 */
export async function deleteSubmittedSample(db: RepoDB, sampleId: number): Promise<void> {
	const deleted = await db
		.delete(Sample)
		.where(and(eq(Sample.id, sampleId), isNull(Sample.metadataArchivedAt)))
		.run();

	if (deleted.changes === 0) {
		throw new Response("Sample not found.", { status: 404 });
	}
}
