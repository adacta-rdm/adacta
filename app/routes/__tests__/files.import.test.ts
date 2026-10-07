import { describe, expect, test } from "bun:test";

import { action } from "~/app/routes/files.import.tsx";
import * as importRoute from "~/app/routes/files.import.tsx";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { createTestRig } from "~/app/testUtils/testRecords.ts";
import { testRoute } from "~/app/testUtils/testRoute.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";

describe("files import route", () => {
	describe("loader", () => {
		test("suggests the rig selected as upload context", async () => {
			const scope = await setupTestRequestScope();
			const rig = await createTestRig(scope, { slug: "test-rig", name: "Test rig" });
			const route = testRoute(scope, importRoute, {});

			const result = await route.loader({
				query: { contextKind: "inventory-entry", contextSlug: rig.slug },
			});

			expect(result.data?.suggestion).toMatchObject({ id: rig.id, slug: rig.slug });
		});

		test("leaves the suggestion empty when the context does not name a rig", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, importRoute, {});

			const result = await route.loader({
				query: { contextKind: "inventory-entry", contextSlug: "missing" },
			});

			expect(result.data?.suggestion).toBeNull();
		});
	});

	describe("action", () => {
		test("rejects a form without files", async () => {
			const scope = await setupTestRequestScope();
			const request = multipartRequest(new FormData());
			const [args] = createMiddlewareArgs(scope, { request, params: {} });

			const result = await action(args);

			if (result instanceof Response) throw new Error("Expected action data.");
			expect(result.init?.status).toBe(400);
			expect(result.data).toEqual({ error: "Select at least one file." });
		});

		test("stores every file in one multipart submission", async () => {
			const scope = await setupTestRequestScope();
			const formData = new FormData();
			formData.append("files", new File(["first file"], "first.txt", { type: "text/plain" }));
			formData.append("files", new File(["second file"], "second.txt", { type: "text/plain" }));
			const request = multipartRequest(formData);
			const [args] = createMiddlewareArgs(scope, { request, params: {} });

			const result = await action(args);

			if (!(result instanceof Response)) throw new Error("Expected a redirect.");
			expect(result.status).toBe(303);
			const location = result.headers.get("Location");
			expect(location).toMatch(/^\/files\/[0-9]+$/);
			const files = await scope
				.get(UploadManager)
				.filesOfUpload(parseId53(location!.split("/").at(-1)!)!);
			expect(files.map((file) => file.originalName)).toEqual(["first.txt", "second.txt"]);
			const contents = await Promise.all(
				files.map(async (file) => {
					const storedFile = await scope.get(UploadManager).getFile(file.id);
					return new Response(await storedFile.read()).text();
				}),
			);
			expect(contents.sort()).toEqual(["first file", "second file"]);
		});

		test("accepts a file larger than the parser default", async () => {
			const scope = await setupTestRequestScope();
			const bytes = new Uint8Array(2 * 1024 * 1024 + 1);
			const formData = new FormData();
			formData.append("files", new File([bytes], "large.bin"));
			const request = multipartRequest(formData);
			const [args] = createMiddlewareArgs(scope, { request, params: {} });

			const result = await action(args);

			if (!(result instanceof Response)) throw new Error("Expected a redirect.");
			expect(result.status).toBe(303);
			const uploadId = parseId53(result.headers.get("Location")!.split("/").at(-1)!)!;
			const files = await scope.get(UploadManager).filesOfUpload(uploadId);
			expect(files[0]!.byteSize).toBe(bytes.byteLength);
		});

		test("keeps the selected rig when a CSV and sidecar open the review", async () => {
			const scope = await setupTestRequestScope();
			const route = testRoute(scope, importRoute, {});

			const result = await route.action(
				{
					contextKind: "inventory-entry",
					contextSlug: "test-rig",
					contextLabel: "Test rig",
				},
				{
					files: [new File(["Time,Flow\n"], "flow.csv"), new File(["[experiment]\n"], "flow.toml")],
				},
			);

			expect(result.status).toBe(303);
			expect(result.location).toMatch(
				/^\/files\/\d+\/measurements\/import\?contextKind=inventory-entry&contextSlug=test-rig&contextLabel=Test\+rig$/,
			);
		});
	});
});

function multipartRequest(formData: FormData): Request {
	return new Request("http://localhost/files/import", {
		method: "POST",
		body: formData,
	});
}
