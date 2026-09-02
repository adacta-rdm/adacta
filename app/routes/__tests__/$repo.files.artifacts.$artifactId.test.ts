import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/$repo.files.artifacts.$artifactId";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs";

import { setupBundle } from "./$repo.files.$bundleId.test";

describe("source artifact download", () => {
	test("downloads the original bytes with their file metadata", async () => {
		const { scope, artifactId } = await setupBundle();
		const request = new Request(`http://localhost/demo/files/artifacts/${artifactId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { repo: "demo", artifactId },
		});

		const response = await loader(args);

		expect(response.headers.get("Content-Type")).toBe("text/csv");
		expect(response.headers.get("Content-Length")).toBe("11");
		expect(response.headers.get("Content-Disposition")).toBe(
			"attachment; filename*=UTF-8''measurement%20%C3%A4.csv",
		);
		expect(await response.text()).toBe("a,b\n1,2\n3,4");
	});
});
