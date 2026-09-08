import { describe, expect, test } from "bun:test";
import { Writable } from "node:stream";

import { eq } from "drizzle-orm";

import {
	action as batchAction,
	loader as batchLoader,
} from "~/app/routes/$repo.samples.$batchSlug.tsx";
import { action as newBatchAction } from "~/app/routes/$repo.samples.new.tsx";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { RepoManager } from "~/app/services/RepoManager.ts";
import { Security } from "~/app/services/Security.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment, signUpTestUser } from "~/app/testUtils/testUtils.ts";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import { LOG_LEVEL, Logger } from "~/lib/logger/Logger.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

/**
 * A signed-in scope working on the "demo" repository.
 */
function environment() {
	return setupTestRepositoryEnvironment("demo");
}

function post(fields: Record<string, string>): Request {
	const form = new FormData();
	for (const [name, value] of Object.entries(fields)) form.set(name, value);

	return new Request("http://localhost/demo/samples", { method: "POST", body: form });
}

function insertBatchRecord(scope: ServiceContainer) {
	const userId = scope.get(Security).userId;

	return scope
		.get(RepoDB)
		.insert(SampleBatch)
		.values({
			slug: "pt-batch",
			name: "Pt batch",
			preparationDate: "2026-01-15",
			preparedById: userId,
			metadataCreatorId: userId,
			metadataCreationTimestamp: new Date("2026-01-15T12:00:00.000Z"),
		})
		.returning()
		.get();
}

/**
 * Create a batch the way the page does. Returns the slug it was given.
 */
async function createBatch(scope: ServiceContainer, fields: Record<string, string> = {}) {
	const request = post({
		name: "Pt batch",
		preparationDate: "2025-01-15",
		preparedById: scope.get(Security).userId,
		...fields,
	});
	const [args] = createMiddlewareArgs(scope, { request, params: { repo: "demo" } });

	const response = await newBatchAction(args);
	if (!(response instanceof Response)) throw new Error("Expected a redirect.");

	return response.headers.get("Location")!.split("/").at(-1)!;
}

/**
 * Submit the batch page, the way its forms do.
 */
async function submitBatch(
	scope: ServiceContainer,
	batchSlug: string,
	fields: Record<string, string>,
) {
	const [args] = createMiddlewareArgs(scope, {
		request: post(fields),
		params: { repo: "demo", batchSlug },
	});

	return batchAction(args);
}

async function loadBatch(scope: ServiceContainer, batchSlug: string) {
	const [args] = createMiddlewareArgs(scope, { params: { repo: "demo", batchSlug } });

	return batchLoader(args);
}

describe("$repo.samples.new action", () => {
	test("creates a batch and redirects to it", async () => {
		const scope = await environment();

		const slug = await createBatch(scope, { activeMaterial: "Pt", support: "Al2O3" });

		expect(slug).toBe("pt-batch");
		expect((await loadBatch(scope, slug)).batch).toEqual(
			expect.objectContaining({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				activeMaterial: "Pt",
				support: "Al2O3",
			}),
		);
	});

	test("leaves an omitted composition empty", async () => {
		const scope = await environment();

		const slug = await createBatch(scope, { activeMaterial: "  ", support: "" });

		expect((await loadBatch(scope, slug)).batch).toEqual(
			expect.objectContaining({ activeMaterial: null, support: null }),
		);
	});

	test("keeps generated slugs unique", async () => {
		const scope = await environment();

		expect(await createBatch(scope)).toBe("pt-batch");
		expect(await createBatch(scope)).toBe("pt-batch-2");
	});

	test("records the preparer separately from the record creator", async () => {
		const scope = await environment();
		const preparedById = await signUpTestUser(scope, {
			name: "Zoe Researcher",
			email: "zoe.researcher@example.com",
		});
		scope.get(RepoManager).grantAccess(preparedById, "demo");

		const slug = await createBatch(scope, { preparedById });
		const { batch } = await loadBatch(scope, slug);

		expect(batch.preparedById).toBe(preparedById);
		expect(batch.metadataCreatorId).toBe(scope.get(Security).userId);
	});

	test("rejects a batch without a name", async () => {
		const scope = await environment();
		const [args] = createMiddlewareArgs(scope, {
			request: post({
				name: "   ",
				preparationDate: "2025-01-15",
				preparedById: scope.get(Security).userId,
			}),
			params: { repo: "demo" },
		});

		expect(await newBatchAction(args)).not.toBeInstanceOf(Response);
	});

	test("rejects a preparation date that is not a calendar date", async () => {
		const scope = await environment();
		const [args] = createMiddlewareArgs(scope, {
			request: post({
				name: "Pt batch",
				preparationDate: "2025-02-30",
				preparedById: scope.get(Security).userId,
			}),
			params: { repo: "demo" },
		});

		await newBatchAction(args);

		expect(scope.get(RepoDB).select().from(SampleBatch).all()).toEqual([]);
	});

	test("rejects a preparer who cannot open the repository", async () => {
		const scope = await environment();
		const outsider = await signUpTestUser(scope, { email: "outsider@example.com" });
		const [args] = createMiddlewareArgs(scope, {
			request: post({
				name: "Pt batch",
				preparationDate: "2025-01-15",
				preparedById: outsider,
			}),
			params: { repo: "demo" },
		});

		await newBatchAction(args);

		expect(scope.get(RepoDB).select().from(SampleBatch).all()).toEqual([]);
	});
});

describe("$repo.samples.$batchSlug action", () => {
	test("returns all add-form validation errors together", async () => {
		const scope = await environment();
		const batch = insertBatchRecord(scope);
		const outsider = await signUpTestUser(scope, { email: "outsider@example.com" });

		const response = await submitBatch(scope, batch.slug, {
			add: "",
			name: " ",
			preparedById: outsider,
		});
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: {
				name: "A sample name is required.",
				preparedById: "The selected preparer cannot access this repository.",
			},
		});
		expect(scope.get(RepoDB).select().from(Sample).all()).toEqual([]);
	});

	test("returns a form error for an unrecognized operation", async () => {
		const scope = await environment();
		const batch = insertBatchRecord(scope);

		const response = await submitBatch(scope, batch.slug, {});
		if (response instanceof Response) throw new Error("Expected action data.");

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: { form: "The sample action is not recognized." },
		});
	});

	test("adds a sample and shows it through the loader", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);

		await submitBatch(scope, slug, {
			add: "",
			name: "#01",
			preparedById: scope.get(Security).userId,
		});

		const { samples } = await loadBatch(scope, slug);

		expect(samples.map((sample) => sample.name)).toEqual(["#01"]);
	});

	test("takes the batch preparer when the form sends none", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);

		await submitBatch(scope, slug, { add: "", name: "#01" });

		const { batch, samples } = await loadBatch(scope, slug);

		expect(samples[0]?.preparedById).toBe(batch.preparedById);
	});

	test("records the sample preparer separately from the record creator", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		const preparedById = await signUpTestUser(scope, {
			name: "Zoe Researcher",
			email: "zoe.researcher@example.com",
		});
		scope.get(RepoManager).grantAccess(preparedById, "demo");

		await submitBatch(scope, slug, { add: "", name: "#01", preparedById });

		expect((await loadBatch(scope, slug)).samples[0]?.preparedBy).toEqual({
			id: preparedById,
			name: "Zoe Researcher",
		});
		expect(scope.get(RepoDB).select().from(Sample).get()?.metadataCreatorId).toBe(
			scope.get(Security).userId,
		);
	});

	test("numbers a generated slug shared by two different labels", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);

		await submitBatch(scope, slug, { add: "", name: "#01" });
		await submitBatch(scope, slug, { add: "", name: "01" });

		const samples = scope.get(RepoDB).select().from(Sample).all();
		expect(samples.map((sample) => [sample.name, sample.slug])).toEqual([
			["#01", "01"],
			["01", "01-2"],
		]);
	});

	test("rejects a duplicate label within the batch", async () => {
		const scope = await environment();
		const batch = insertBatchRecord(scope);
		await submitBatch(scope, batch.slug, { add: "", name: "#01" });

		const response = await submitBatch(scope, batch.slug, { add: "", name: "#01" });

		if (response instanceof Response || typeof response === "string") {
			throw new Error("Expected action data.");
		}

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: { name: 'This batch already contains a sample named "#01".' },
		});
		expect((await loadBatch(scope, batch.slug)).samples).toHaveLength(1);
	});

	test("reports when five generated sample slugs are already in use", async () => {
		const scope = await environment();
		const db = scope.get(RepoDB);
		const userId = scope.get(Security).userId;
		const createdAt = new Date("2026-01-15T12:00:00.000Z");
		const batch = insertBatchRecord(scope);

		for (let attempt = 1; attempt <= 5; attempt++) {
			db.insert(Sample)
				.values({
					batchId: batch.id,
					slug: attempt === 1 ? "01" : `01-${attempt}`,
					name: `existing-${attempt}`,
					preparedById: userId,
					metadataCreatorId: userId,
					metadataCreationTimestamp: createdAt,
				})
				.run();
		}

		const lines: string[] = [];
		const stream = new Writable({
			write(chunk, _encoding, done) {
				lines.push(String(chunk).trimEnd());
				done();
			},
		});
		scope.set(new Logger({ level: LOG_LEVEL.ERROR, stream }));

		const response = await submitBatch(scope, batch.slug, { add: "", name: "01" });
		if (response instanceof Response || typeof response === "string") {
			throw new Error("Expected action data.");
		}

		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({
			errors: {
				name: "A URL identifier could not be created for this sample. Choose a name that differs by more than punctuation.",
			},
		});
		expect(JSON.parse(lines[0])).toMatchObject({
			level: "ERROR",
			event: "sample_slug_allocation_failed",
			repository: "demo",
			batchId: batch.id,
			sampleName: "01",
			baseSlug: "01",
			attempts: 5,
		});
	});

	test("keeps the label of an archived sample reserved", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		await submitBatch(scope, slug, { add: "", name: "#01" });

		scope
			.get(RepoDB)
			.update(Sample)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(Sample.name, "#01"))
			.run();

		const loaded = await loadBatch(scope, slug);
		const response = await submitBatch(scope, slug, { add: "", name: "#01" });

		// The loader includes the archived sample so its label can inform the next
		// suggestion. The label also remains unavailable to the action.
		expect(loaded.samples[0]?.metadataArchivedAt).toBeInstanceOf(Date);
		expect(response).not.toBeInstanceOf(Response);
	});

	test("deletes a sample", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);
		await submitBatch(scope, slug, { add: "", name: "#01" });
		const [sample] = scope.get(RepoDB).select().from(Sample).all();

		const response = await submitBatch(scope, slug, { delete: String(sample.id) });

		expect(response).toBeInstanceOf(Response);
		expect((await loadBatch(scope, slug)).samples).toEqual([]);
	});

	test("answers 404 for a sample that is not there", async () => {
		const scope = await environment();
		const slug = await createBatch(scope);

		expect(submitBatch(scope, slug, { delete: "999999" })).rejects.toMatchObject({ status: 404 });
	});

	test("answers 404 for a batch that is not there", async () => {
		const scope = await environment();

		expect(submitBatch(scope, "no-such-batch", { add: "", name: "#01" })).rejects.toMatchObject({
			status: 404,
		});
	});
});

describe("$repo.samples.$batchSlug archived batch", () => {
	test("the page opens and reports that the batch is archived", async () => {
		const scope = await environment();
		const batch = insertBatchRecord(scope);
		archive(scope, batch.slug);

		const loaded = await loadBatch(scope, batch.slug);

		expect(loaded.batch.name).toBe("Pt batch");
		expect(loaded.archived).toBe(true);
	});

	test("an active batch is not reported as archived", async () => {
		const scope = await environment();
		const batch = insertBatchRecord(scope);

		expect((await loadBatch(scope, batch.slug)).archived).toBe(false);
	});

	test("a sample cannot be added to an archived batch", async () => {
		const scope = await environment();
		const batch = insertBatchRecord(scope);
		archive(scope, batch.slug);

		expect(submitBatch(scope, batch.slug, { add: "", name: "#01" })).rejects.toMatchObject({
			status: 404,
		});
	});
});

function archive(scope: ServiceContainer, slug: string) {
	scope
		.get(RepoDB)
		.update(SampleBatch)
		.set({ metadataArchivedAt: new Date() })
		.where(eq(SampleBatch.slug, slug))
		.run();
}
