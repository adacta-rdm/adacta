import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/$repo.files.$uploadId.tsx";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";

describe("uploaded files loader", () => {
	test("returns the metadata of every file the upload delivered", async () => {
		const { scope, uploadId } = await setupUpload();
		const request = new Request(`http://localhost/demo/files/${uploadId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { repo: "demo", uploadId: String(uploadId) },
		});

		const result = await loader(args);

		expect(result.files).toEqual([
			expect.objectContaining({
				uploadId,
				originalName: "measurement ä.csv",
				mediaType: "text/csv",
				byteSize: 11,
			}),
		]);
	});

	test("answers 404 for an upload that delivered nothing", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const uploadId = "1234567890123";
		const [args] = createMiddlewareArgs(scope, {
			request: new Request(`http://localhost/demo/files/${uploadId}`),
			params: { repo: "demo", uploadId },
		});

		await expect(loader(args)).rejects.toMatchObject({ status: 404 });
	});

	test.each([["abc"], ["12abc"], ["1e3"], ["-5"], ["9007199254740992"]])(
		"answers 404 for the invalid upload ID %p",
		async (uploadId) => {
			const scope = await setupTestRepositoryEnvironment("demo");
			const [args] = createMiddlewareArgs(scope, {
				request: new Request(`http://localhost/demo/files/${uploadId}`),
				params: { repo: "demo", uploadId },
			});

			await expect(loader(args)).rejects.toMatchObject({ status: 404 });
		},
	);
});

export async function setupUpload() {
	const scope = await setupTestRepositoryEnvironment("demo");
	const manager = scope.get(UploadManager);
	const upload = manager.beginUpload();

	const fileId = await upload.add({
		originalName: "measurement ä.csv",
		mediaType: "text/csv",
		source: new Blob(["a,b\n1,2\n3,4"]).stream(),
	});

	const uploadId = await upload.commit(scope.get(Security).userId);

	return { scope, uploadId, fileId };
}
