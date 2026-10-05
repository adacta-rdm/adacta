import { describe, expect, test } from "bun:test";

import { eq, inArray } from "drizzle-orm";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import {
	OriginalFileNotFoundError,
	UploadManager,
	UploadNotFoundError,
} from "~/app/services/UploadManager.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { Id } from "~/drizzle/schema/Id.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

describe("UploadManager", () => {
	test("publishes the files of one upload under a shared upload id", async () => {
		const scope = await setupTestRequestScope();
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

	test("gives each committed file a row in Id", async () => {
		const scope = await setupTestRequestScope();
		const manager = scope.get(UploadManager);
		const upload = manager.beginUpload();

		const first = await upload.add({ originalName: "a.csv", source: new Blob(["a"]).stream() });
		const second = await upload.add({ originalName: "b.csv", source: new Blob(["b"]).stream() });
		await upload.commit(scope.get(Security).userId);

		const rows = await scope
			.get(ApplicationDatabase)
			.select()
			.from(Id)
			.where(inArray(Id.id, [first, second]))
			.all();

		expect(rows).toHaveLength(2);
	});

	test("writes no rows when the commit fails", async () => {
		const scope = await setupTestRequestScope();
		const manager = scope.get(UploadManager);
		const upload = manager.beginUpload();

		const first = await upload.add({ originalName: "a.csv", source: new Blob(["a"]).stream() });

		// The column original_name is NOT NULL. The second statement of the batch
		// therefore fails after the first has written the Id row.
		const second = await upload.add({
			originalName: null as unknown as string,
			source: new Blob(["b"]).stream(),
		});

		await expect(upload.commit(scope.get(Security).userId)).rejects.toThrow();

		const db = scope.get(ApplicationDatabase);
		expect(
			await db
				.select()
				.from(Id)
				.where(inArray(Id.id, [first, second]))
				.all(),
		).toEqual([]);
		expect(await db.select().from(OriginalFile).all()).toEqual([]);
	});

	test("publishes nothing when one of the files fails to arrive", async () => {
		const scope = await setupTestRequestScope();
		const manager = scope.get(UploadManager);
		const storage = scope.get(StorageEngine);
		const upload = manager.beginUpload();
		const firstFileId = await upload.add({
			originalName: "first.csv",
			mediaType: "text/csv",
			source: new Blob(["complete"]).stream(),
		});

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
		expect(await storage.exists(`uploads/${upload.id}/${firstFileId}`)).toBe(false);
	});

	test("discard removes staged files and closes the upload", async () => {
		const scope = await setupTestRequestScope();
		const manager = scope.get(UploadManager);
		const storage = scope.get(StorageEngine);
		const upload = manager.beginUpload();
		const fileId = await upload.add({
			originalName: "measurement.csv",
			source: new Blob(["source contents"]).stream(),
		});

		expect(await storage.exists(`uploads/${upload.id}/${fileId}`)).toBe(true);

		await upload.discard();

		expect(await storage.exists(`uploads/${upload.id}/${fileId}`)).toBe(false);
		await expect(upload.commit(scope.get(Security).userId)).rejects.toThrow("discarded");
	});

	test("archiving one file leaves the others of its upload in place", async () => {
		const scope = await setupTestRequestScope();
		const manager = scope.get(UploadManager);
		const upload = manager.beginUpload();

		await upload.add({ originalName: "a.csv", source: new Blob(["a"]).stream() });
		await upload.add({ originalName: "b.csv", source: new Blob(["b"]).stream() });

		const uploadId = await upload.commit(scope.get(Security).userId);
		const [first, second] = await manager.filesOfUpload(uploadId);

		await scope
			.get(ApplicationDatabase)
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
