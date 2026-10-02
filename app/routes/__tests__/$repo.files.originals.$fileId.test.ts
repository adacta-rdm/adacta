import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/$repo.files.originals.$fileId.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";

import { setupUpload } from "./$repo.files.$uploadId.test.ts";

describe("original file download", () => {
	test("downloads the original bytes with their file metadata", async () => {
		const { scope, fileId } = await setupUpload();
		const request = new Request(`http://localhost/demo/files/originals/${fileId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { repo: "demo", fileId },
		});

		const response = await loader(args);

		expect(response.headers.get("Content-Type")).toBe("text/csv");
		expect(response.headers.get("Content-Length")).toBe("11");
		expect(response.headers.get("Content-Disposition")).toBe(
			"attachment; filename*=UTF-8''measurement%20%C3%A4.csv",
		);
		expect(await response.text()).toBe("a,b\n1,2\n3,4");
	});

	test("answers 404 for an unknown file", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const fileId = "no-such-file";
		const request = new Request(`http://localhost/demo/files/originals/${fileId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { repo: "demo", fileId },
		});

		expect(loader(args)).rejects.toMatchObject({ status: 404 });
	});
});
