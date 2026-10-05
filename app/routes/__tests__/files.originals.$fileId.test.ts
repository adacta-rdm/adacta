import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/files.originals.$fileId.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { createTestUpload } from "~/app/testUtils/testRecords.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("original file download", () => {
	test("downloads the original bytes with their file metadata", async () => {
		const scope = await setupTestRequestScope();
		const { fileId } = await createTestUpload(scope);
		const request = new Request(`http://localhost/files/originals/${fileId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { fileId: String(fileId) },
		});

		const result = await loader(args);

		expect(result.headers.get("Content-Type")).toBe("text/csv");
		expect(result.headers.get("Content-Length")).toBe("11");
		expect(result.headers.get("Content-Disposition")).toBe(
			"attachment; filename*=UTF-8''measurement%20%C3%A4.csv",
		);
		expect(await result.text()).toBe("a,b\n1,2\n3,4");
	});

	test("answers 404 for an unknown file", async () => {
		const scope = await setupTestRequestScope();
		const fileId = "1234567890123";
		const request = new Request(`http://localhost/files/originals/${fileId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { fileId },
		});

		await expect(loader(args)).rejects.toMatchObject({ status: 404 });
	});

	test.each([["abc"], ["12abc"], ["1e3"], ["-5"], ["9007199254740992"]])(
		"answers 404 for the invalid file ID %p",
		async (fileId) => {
			const scope = await setupTestRequestScope();
			const [args] = createMiddlewareArgs(scope, {
				request: new Request(`http://localhost/files/originals/${fileId}`),
				params: { fileId },
			});

			await expect(loader(args)).rejects.toMatchObject({ status: 404 });
		},
	);
});
