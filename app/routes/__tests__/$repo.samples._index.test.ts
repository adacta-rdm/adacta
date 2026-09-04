import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { loader } from "~/app/routes/$repo.samples._index";
import { RepoDB } from "~/app/services/RepoDB";
import { Security } from "~/app/services/Security";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils";
import { Sample } from "~/drizzle/schema/repo.Sample";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";

describe("samples index loader", () => {
	test("describes each batch", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3", preparationDate: "2025-01-15" }, 2);

		const { batches } = await load(scope);

		expect(batches).toEqual([
			expect.objectContaining({
				slug: "pt-al2o3",
				name: "Pt/Al2O3",
				preparationDate: "2025-01-15",
				sampleCount: 2,
				preparedBy: expect.objectContaining({ name: "Test User" }),
			}),
		]);
	});

	test("counts only the samples that are not archived", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const batch = addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" }, 3);

		scope
			.get(RepoDB)
			.update(Sample)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(Sample.batchId, batch.id))
			.run();

		expect((await load(scope)).batches[0]?.sampleCount).toBe(0);
	});

	test("puts the most recently prepared batch first", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		addBatch(scope, { slug: "older", name: "Older", preparationDate: "2024-03-01" });
		addBatch(scope, { slug: "newer", name: "Newer", preparationDate: "2025-06-01" });

		expect((await load(scope)).batches.map((batch) => batch.slug)).toEqual(["newer", "older"]);
	});

	test("leaves out an archived batch", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const batch = addBatch(scope, { slug: "pt-al2o3", name: "Pt/Al2O3" });

		scope
			.get(RepoDB)
			.update(SampleBatch)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(SampleBatch.id, batch.id))
			.run();

		expect((await load(scope)).batches).toEqual([]);
	});
});

async function load(scope: ServiceContainer) {
	const [args] = createMiddlewareArgs(scope, { params: { repo: "demo" } });

	return loader(args);
}

/**
 * Write one batch and the given number of samples in it.
 */
function addBatch(
	scope: ServiceContainer,
	values: { slug: string; name: string; preparationDate?: string },
	sampleCount = 0,
) {
	const db = scope.get(RepoDB);
	const userId = scope.get(Security).userId;
	const metadata = {
		metadataCreatorId: userId,
		metadataCreationTimestamp: new Date("2026-01-15T12:00:00.000Z"),
	};

	const batch = db
		.insert(SampleBatch)
		.values({
			slug: values.slug,
			name: values.name,
			preparationDate: values.preparationDate ?? "2025-01-15",
			preparedById: userId,
			...metadata,
		})
		.returning()
		.get();

	for (let index = 1; index <= sampleCount; index++) {
		db.insert(Sample)
			.values({
				batchId: batch.id,
				slug: `0${index}`,
				name: `#0${index}`,
				preparedById: userId,
				...metadata,
			})
			.run();
	}

	return batch;
}
