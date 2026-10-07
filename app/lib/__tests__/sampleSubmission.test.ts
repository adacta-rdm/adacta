import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { addSample } from "~/app/lib/addSample.ts";
import { deleteSubmittedSample } from "~/app/lib/sampleSubmission.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { createTestDataset } from "~/app/testUtils/testRecords.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { DatasetSample } from "~/drizzle/schema/DatasetSample.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";
import { id53 } from "~/lib/id53/id53.ts";

async function setupSample() {
	const scope = await setupTestRequestScope();
	const db = scope.get(ApplicationDatabase);
	const userId = scope.get(Security).userId;
	const batchId = id53();
	await db.insert(Id).values({ id: batchId }).run();
	await db
		.insert(SampleBatch)
		.values({
			id: batchId,
			slug: "batch",
			name: "Batch",
			preparationDate: "2026-01-15",
			preparedById: userId,
			metadataCreatorId: userId,
			metadataCreationTimestamp: new Date(),
		})
		.run();
	const sample = await addSample(db, {
		batchId,
		name: "#01",
		preparedById: userId,
		metadataCreatorId: userId,
		metadataCreationTimestamp: new Date(),
	});
	return { scope, db, sample };
}

describe("deleteSubmittedSample", () => {
	test("keeps a sample referenced by a dataset and directs the user to archive it", async () => {
		const { scope, db, sample } = await setupSample();
		const { datasetId } = await createTestDataset(scope);
		await db
			.insert(DatasetSample)
			.values({
				datasetId,
				position: 0,
				sampleId: sample.id,
				sampleName: sample.name,
				symbolKey: "sample-node",
				identifier: String(sample.id),
				pidNodeId: "sample-node",
				inletNodeIds: [],
				outletNodeIds: [],
			})
			.run();
		expect(await deleteSubmittedSample(db, sample.id)).toEqual({
			form: "This sample is referenced by a dataset, so it cannot be deleted. Archive it instead.",
		});
		expect(await db.select().from(Sample).where(eq(Sample.id, sample.id)).get()).toBeDefined();
		expect(await db.select().from(Id).where(eq(Id.id, sample.id)).get()).toEqual({ id: sample.id });
	});
	test("removes the sample and its ID row", async () => {
		const { db, sample } = await setupSample();

		await deleteSubmittedSample(db, sample.id);

		expect(await db.select().from(Sample).where(eq(Sample.id, sample.id)).get()).toBeUndefined();
		expect(await db.select().from(Id).where(eq(Id.id, sample.id)).get()).toBeUndefined();
	});

	test("keeps an archived sample and its ID row", async () => {
		const { db, sample } = await setupSample();
		await db
			.update(Sample)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(Sample.id, sample.id))
			.run();

		await expect(deleteSubmittedSample(db, sample.id)).rejects.toMatchObject({
			status: 404,
		});
		expect(await db.select().from(Id).where(eq(Id.id, sample.id)).get()).toEqual({ id: sample.id });
	});
});
