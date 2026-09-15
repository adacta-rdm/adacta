import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { SourceFileNotFoundError, SourceManager } from "~/app/services/SourceManager.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { SourceArtifact } from "~/drizzle/schema/repo.SourceArtifact.ts";

describe("SourceManager", () => {
	test("publishes the files of one upload under a shared upload id", async () => {
		const scope = await setupTestRepositoryEnvironment();
		const sources = scope.get(SourceManager);
		const upload = sources.beginUpload();

		await upload.add({
			originalName: "measurement.csv",
			mediaType: "text/csv",
			source: new Blob(["source contents"]).stream(),
		});
		await upload.add({
			originalName: "measurement.json",
			mediaType: "application/json",
			source: new Blob(["{}"]).stream(),
		});

		const uploadId = await upload.commit(scope.get(Security).userId);
		const artifacts = sources.artifactsOfUpload(uploadId);

		expect(
			artifacts.map(({ uploadId: id, originalName, mediaType, byteSize }) => ({
				uploadId: id,
				originalName,
				mediaType,
				byteSize,
			})),
		).toEqual([
			{
				uploadId,
				originalName: "measurement.csv",
				mediaType: "text/csv",
				byteSize: 15,
			},
			{
				uploadId,
				originalName: "measurement.json",
				mediaType: "application/json",
				byteSize: 2,
			},
		]);

		expect(artifacts[0]?.metadataCreatorId).toBe(scope.get(Security).userId);

		const contents = await Promise.all(
			artifacts.map(async ({ id }) => {
				const artifact = sources.getArtifact(id);
				return new Response(await artifact.read()).text();
			}),
		);

		expect(contents).toEqual(["source contents", "{}"]);
	});

	test("publishes nothing when one of the files fails to arrive", async () => {
		const scope = await setupTestRepositoryEnvironment();
		const sources = scope.get(SourceManager);
		const upload = sources.beginUpload();

		try {
			await upload.add({
				originalName: "measurement.csv",
				mediaType: "text/csv",
				source: failingStream(),
			});
			expect.unreachable("Expected the upload to fail");
		} catch (error) {
			expect((error as Error).message).toBe("Source failed");
		}

		expect(() => sources.artifactsOfUpload(upload.id)).toThrow(SourceFileNotFoundError);
	});

	test("archiving one file leaves the others of its upload in place", async () => {
		const scope = await setupTestRepositoryEnvironment();
		const sources = scope.get(SourceManager);
		const upload = sources.beginUpload();

		await upload.add({ originalName: "a.csv", source: new Blob(["a"]).stream() });
		await upload.add({ originalName: "b.csv", source: new Blob(["b"]).stream() });

		const uploadId = await upload.commit(scope.get(Security).userId);
		const [first, second] = sources.artifactsOfUpload(uploadId);

		scope
			.get(RepoDB)
			.update(SourceArtifact)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(SourceArtifact.id, first!.id))
			.run();

		expect(() => sources.getArtifact(first!.id)).toThrow(SourceFileNotFoundError);
		expect(sources.getArtifact(second!.id).originalName).toBe("b.csv");
		expect(sources.artifactsOfUpload(uploadId).map((row) => row.originalName)).toEqual(["b.csv"]);
	});
});

function failingStream(): ReadableStream<Uint8Array> {
	let first = true;

	return new ReadableStream({
		pull(controller) {
			if (first) {
				first = false;
				controller.enqueue(new TextEncoder().encode("partial"));
				return;
			}

			controller.error(new Error("Source failed"));
		},
	});
}
