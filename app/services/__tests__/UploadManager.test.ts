import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import {
	OriginalFileNotFoundError,
	UploadManager,
	UploadNotFoundError,
} from "~/app/services/UploadManager.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";
import { OriginalFile } from "~/drizzle/schema/repo.OriginalFile.ts";

describe("UploadManager", () => {
	test("publishes the files of one upload under a shared upload id", async () => {
		const scope = await setupTestRepositoryEnvironment();
		const manager = scope.get(UploadManager);
		const upload = manager.beginUpload();

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
		const files = await manager.filesOfUpload(uploadId);

		expect(
			files.map(({ uploadId: id, originalName, mediaType, byteSize }) => ({
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

		expect(files[0]?.metadataCreatorId).toBe(scope.get(Security).userId);

		const contents = await Promise.all(
			files.map(async ({ id }) => {
				const file = await manager.getFile(id);
				return new Response(await file.read()).text();
			}),
		);

		expect(contents).toEqual(["source contents", "{}"]);
	});

	test("publishes nothing when one of the files fails to arrive", async () => {
		const scope = await setupTestRepositoryEnvironment();
		const manager = scope.get(UploadManager);
		const upload = manager.beginUpload();

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

		await expect(manager.filesOfUpload(upload.id)).rejects.toBeInstanceOf(UploadNotFoundError);
	});

	test("archiving one file leaves the others of its upload in place", async () => {
		const scope = await setupTestRepositoryEnvironment();
		const manager = scope.get(UploadManager);
		const upload = manager.beginUpload();

		await upload.add({ originalName: "a.csv", source: new Blob(["a"]).stream() });
		await upload.add({ originalName: "b.csv", source: new Blob(["b"]).stream() });

		const uploadId = await upload.commit(scope.get(Security).userId);
		const [first, second] = await manager.filesOfUpload(uploadId);

		await scope
			.get(RepoDB)
			.update(OriginalFile)
			.set({ metadataArchivedAt: new Date() })
			.where(eq(OriginalFile.id, first!.id))
			.run();

		await expect(manager.getFile(first!.id)).rejects.toBeInstanceOf(OriginalFileNotFoundError);
		expect((await manager.getFile(second!.id)).originalName).toBe("b.csv");
		expect((await manager.filesOfUpload(uploadId)).map((row) => row.originalName)).toEqual([
			"b.csv",
		]);
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
