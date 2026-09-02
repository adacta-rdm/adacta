import { describe, expect, test } from "bun:test";

import { Security } from "~/app/services/Security";
import { SourceFileNotFoundError, SourceManager } from "~/app/services/SourceManager";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils";

describe("SourceManager", () => {
	test("finalizes uploaded artifacts as one source bundle", async () => {
		const scope = await setupTestRepositoryEnvironment();
		const sources = scope.get(SourceManager);
		const pendingBundle = sources.beginBundle();

		await pendingBundle.add({
			originalName: "measurement.csv",
			mediaType: "text/csv",
			source: new Blob(["source contents"]).stream(),
		});
		await pendingBundle.add({
			originalName: "measurement.json",
			mediaType: "application/json",
			source: new Blob(["{}"]).stream(),
		});
		const bundleId = await pendingBundle.commit(scope.get(Security).userId);
		const bundle = sources.getBundle(bundleId);

		expect(bundle.id).toBe(bundleId);
		expect(bundle.metadataCreatorId).toBe(scope.get(Security).userId);
		expect(
			bundle.artifacts.map(({ sourceBundleId, originalName, mediaType, byteSize }) => ({
				sourceBundleId,
				originalName,
				mediaType,
				byteSize,
			})),
		).toEqual([
			{
				sourceBundleId: bundleId,
				originalName: "measurement.csv",
				mediaType: "text/csv",
				byteSize: 15,
			},
			{
				sourceBundleId: bundleId,
				originalName: "measurement.json",
				mediaType: "application/json",
				byteSize: 2,
			},
		]);

		const contents = await Promise.all(
			bundle.artifacts.map(async ({ id }) => {
				const artifact = sources.getArtifact(id);
				return new Response(await artifact.read()).text();
			}),
		);
		expect(contents).toEqual(["source contents", "{}"]);
	});

	test("does not publish a bundle when an artifact upload fails", async () => {
		const scope = await setupTestRepositoryEnvironment();
		const sources = scope.get(SourceManager);
		const bundleUpload = sources.beginBundle();

		try {
			await bundleUpload.add({
				originalName: "measurement.csv",
				mediaType: "text/csv",
				source: failingStream(),
			});
			expect.unreachable("Expected the upload to fail");
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect((error as Error).message).toBe("Source failed");
		}
		expect(() => sources.getBundle(bundleUpload.id)).toThrow(SourceFileNotFoundError);
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
