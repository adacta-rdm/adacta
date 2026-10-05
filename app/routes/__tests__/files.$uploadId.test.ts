import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/files.$uploadId.tsx";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { createTestUpload } from "~/app/testUtils/testRecords.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("uploaded files loader", () => {
	test("returns the metadata of every file the upload delivered", async () => {
		const scope = await setupTestRequestScope();
		const { uploadId } = await createTestUpload(scope);
		const request = new Request(`http://localhost/files/${uploadId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { uploadId: String(uploadId) },
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
		const scope = await setupTestRequestScope();
		const uploadId = "1234567890123";
		const [args] = createMiddlewareArgs(scope, {
			request: new Request(`http://localhost/files/${uploadId}`),
			params: { uploadId },
		});

		await expect(loader(args)).rejects.toMatchObject({ status: 404 });
	});

	test.each([["abc"], ["12abc"], ["1e3"], ["-5"], ["9007199254740992"]])(
		"answers 404 for the invalid upload ID %p",
		async (uploadId) => {
			const scope = await setupTestRequestScope();
			const [args] = createMiddlewareArgs(scope, {
				request: new Request(`http://localhost/files/${uploadId}`),
				params: { uploadId },
			});

			await expect(loader(args)).rejects.toMatchObject({ status: 404 });
		},
	);
});
