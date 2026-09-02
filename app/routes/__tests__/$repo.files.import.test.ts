import { describe, expect, test } from "bun:test";

import { action } from "~/app/routes/$repo.files.import";
import { SourceManager } from "~/app/services/SourceManager";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils";

describe("import action", () => {
	test("rejects a form without source files", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const request = multipartRequest(new FormData());
		const [args] = createMiddlewareArgs(scope, { request, params: { repo: "demo" } });

		const response = await action(args);

		if (response instanceof Response) throw new Error("Expected action data.");
		expect(response.init?.status).toBe(400);
		expect(response.data).toEqual({ error: "Select at least one file." });
	});

	test("stores every file in one multipart submission", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const formData = new FormData();
		formData.append("files", new File(["first file"], "first.txt", { type: "text/plain" }));
		formData.append("files", new File(["second file"], "second.txt", { type: "text/plain" }));
		const request = multipartRequest(formData);
		const [args] = createMiddlewareArgs(scope, { request, params: { repo: "demo" } });

		const response = await action(args);

		if (!(response instanceof Response)) throw new Error("Expected a redirect.");
		expect(response.status).toBe(303);
		const location = response.headers.get("Location");
		expect(location).toMatch(/^\/demo\/files\/[0-9a-f-]{36}$/);
		const bundle = scope.get(SourceManager).getBundle(location!.split("/").at(-1)!);
		expect(bundle.artifacts.map((artifact) => artifact.originalName)).toEqual([
			"first.txt",
			"second.txt",
		]);
		const contents = await Promise.all(
			bundle.artifacts.map(async (artifact) => {
				const storedArtifact = scope.get(SourceManager).getArtifact(artifact.id);
				return new Response(await storedArtifact.read()).text();
			}),
		);
		expect(contents.sort()).toEqual(["first file", "second file"]);
	});

	test("accepts a source file larger than the parser default", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const bytes = new Uint8Array(2 * 1024 * 1024 + 1);
		const formData = new FormData();
		formData.append("files", new File([bytes], "large.bin"));
		const request = multipartRequest(formData);
		const [args] = createMiddlewareArgs(scope, { request, params: { repo: "demo" } });

		const response = await action(args);

		if (!(response instanceof Response)) throw new Error("Expected a redirect.");
		expect(response.status).toBe(303);
		const bundleId = response.headers.get("Location")!.split("/").at(-1)!;
		const bundle = scope.get(SourceManager).getBundle(bundleId);
		expect(bundle.artifacts[0]!.byteSize).toBe(bytes.byteLength);
	});
});

function multipartRequest(formData: FormData): Request {
	return new Request("http://localhost/demo/files/import", {
		method: "POST",
		body: formData,
	});
}
