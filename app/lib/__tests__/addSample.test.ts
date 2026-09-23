import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { addSample } from "~/app/lib/addSample.ts";
import { EntityAlreadyExistsError } from "~/app/lib/error/EntityAlreadyExistsError.ts";
import { SlugAllocationError } from "~/app/lib/error/SlugAllocationError.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import type { Entity, NewEntity } from "~/drizzle/Schema.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";

const CREATION_TIME = new Date("2026-01-15T12:00:00.000Z");

async function environment() {
	const scope = await setupTestRepositoryEnvironment();
	const db = scope.get(RepoDB);
	const userId = scope.get(Security).userId;
	const batch = await insertBatch(db, userId, "first-batch");

	return { db, userId, batch };
}

async function insertBatch(
	db: RepoDB,
	userId: string,
	slug: string,
): Promise<Entity<"SampleBatch">> {
	return await db
		.insert(SampleBatch)
		.values({
			slug,
			name: slug,
			preparationDate: "2026-01-15",
			preparedById: userId,
			metadataCreatorId: userId,
			metadataCreationTimestamp: CREATION_TIME,
		})
		.returning()
		.get();
}

function sampleValues(
	batchId: number,
	userId: string,
	name = "#01",
): Omit<NewEntity<"Sample">, "slug"> {
	return {
		batchId,
		name,
		preparedById: userId,
		metadataCreatorId: userId,
		metadataCreationTimestamp: CREATION_TIME,
	};
}

async function insertSample(
	db: RepoDB,
	values: Omit<NewEntity<"Sample">, "slug">,
	slug: string,
): Promise<Entity<"Sample">> {
	return await db
		.insert(Sample)
		.values({ ...values, slug })
		.returning()
		.get();
}

async function expectDuplicateSampleName(promise: ReturnType<typeof addSample>, name: string) {
	let error: unknown;

	try {
		await promise;
	} catch (caught) {
		error = caught;
	}

	expect(error).toBeInstanceOf(EntityAlreadyExistsError);
	expect(error).toMatchObject({ entity: "Sample", field: "name", value: name });
}

describe("addSample", () => {
	test("inserts the sample with a slug generated from its name", async () => {
		const { db, userId, batch } = await environment();
		const values = sampleValues(batch.id, userId);

		await addSample(db, values);

		expect(await db.select().from(Sample).get()).toEqual(
			expect.objectContaining({ ...values, slug: "01" }),
		);
	});

	test("returns the inserted sample", async () => {
		const { db, userId, batch } = await environment();

		const result = await addSample(db, sampleValues(batch.id, userId));
		const inserted = await db.select().from(Sample).get();
		if (!inserted) throw new Error("Expected the sample to be inserted.");

		expect(result).toEqual(inserted);
	});

	test("adds a numeric suffix when another label has the same slug", async () => {
		const { db, userId, batch } = await environment();

		// "#01" and "01" are different sample labels. Removing the leading "#"
		// gives both labels the slug "01". The second slug therefore needs a suffix.
		await insertSample(db, sampleValues(batch.id, userId, "#01"), "01");

		const result = await addSample(db, sampleValues(batch.id, userId, "01"));

		expect(result).toEqual(expect.objectContaining({ name: "01", slug: "01-2" }));
	});

	test("throws an error when the batch already contains the label", async () => {
		const { db, userId, batch } = await environment();
		await insertSample(db, sampleValues(batch.id, userId), "01");

		const result = addSample(db, sampleValues(batch.id, userId));

		await expectDuplicateSampleName(result, "#01");
		expect(await db.select().from(Sample).all()).toHaveLength(1);
	});

	test("keeps the label of an archived sample reserved", async () => {
		const { db, userId, batch } = await environment();
		await insertSample(
			db,
			{ ...sampleValues(batch.id, userId), metadataArchivedAt: new Date() },
			"01",
		);

		const result = addSample(db, sampleValues(batch.id, userId));

		await expectDuplicateSampleName(result, "#01");
		expect(await db.select().from(Sample).all()).toHaveLength(1);
	});

	test("allows the same label in another batch", async () => {
		const { db, userId, batch } = await environment();
		const otherBatch = await insertBatch(db, userId, "second-batch");
		await insertSample(db, sampleValues(batch.id, userId), "01");

		const result = await addSample(db, sampleValues(otherBatch.id, userId));

		expect(result).toEqual(
			expect.objectContaining({ batchId: otherBatch.id, name: "#01", slug: "01" }),
		);
	});

	test("retries when another insert takes the generated slug", async () => {
		const { db, userId, batch } = await environment();
		const competingValues = sampleValues(batch.id, userId, "01");
		let insertedCompetingSample = false;

		// Insert the competing row after addSample has selected a slug and just
		// before it tries to insert. This makes the unique constraint report the
		// same collision that two requests can produce.
		const racingDb = new Proxy(db, {
			get(target, property) {
				if (property === "insert") {
					return (table: typeof Sample) => {
						if (table === Sample && !insertedCompetingSample) {
							insertedCompetingSample = true;
							void insertSample(db, competingValues, "01");
						}

						return db.insert(table);
					};
				}

				const value: unknown = Reflect.get(target, property, target);
				return typeof value === "function" ? value.bind(target) : value;
			},
		}) as RepoDB;

		const result = await addSample(racingDb, sampleValues(batch.id, userId));

		expect(result).toEqual(expect.objectContaining({ name: "#01", slug: "01-2" }));
		expect(await db.select().from(Sample).all()).toHaveLength(2);
	});

	test("reports when five generated slugs are already in use", async () => {
		const { db, userId, batch } = await environment();

		for (let attempt = 1; attempt <= 5; attempt++) {
			const slug = attempt === 1 ? "01" : `01-${attempt}`;
			await insertSample(db, sampleValues(batch.id, userId, `existing-${attempt}`), slug);
		}

		let error: unknown;
		try {
			await addSample(db, sampleValues(batch.id, userId, "01"));
		} catch (caught) {
			error = caught;
		}

		expect(error).toBeInstanceOf(SlugAllocationError);
		expect(error).toMatchObject({
			entity: "sample",
			value: "01",
			base: "01",
			attempts: 5,
		});
		expect(await db.select().from(Sample).all()).toHaveLength(5);
	});

	test("throws database errors unrelated to the two unique constraints", async () => {
		const { db, userId } = await environment();
		const missingBatchId = 999_999;

		expect(addSample(db, sampleValues(missingBatchId, userId))).rejects.toMatchObject({
			cause: {
				code: "SQLITE_CONSTRAINT_FOREIGNKEY",
				message: "FOREIGN KEY constraint failed",
			},
		});
		expect(await db.select().from(Sample).where(eq(Sample.batchId, missingBatchId)).all()).toEqual(
			[],
		);
	});
});
