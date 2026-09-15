import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/$repo.files.$uploadId.tsx";
import { Security } from "~/app/services/Security.ts";
import { SourceManager } from "~/app/services/SourceManager.ts";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils.ts";

describe("uploaded files loader", () => {
	test("returns the metadata of every file the upload delivered", async () => {
		const { scope, uploadId } = await setupUpload();
		const request = new Request(`http://localhost/demo/files/${uploadId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { repo: "demo", uploadId },
		});

		const result = await loader(args);

		expect(result.artifacts).toEqual([
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
		const uploadId = "no-such-upload";
		const [args] = createMiddlewareArgs(scope, {
			request: new Request(`http://localhost/demo/files/${uploadId}`),
			params: { repo: "demo", uploadId },
		});

		expect(loader(args)).rejects.toMatchObject({ status: 404 });
	});
});

export async function setupUpload() {
	const scope = await setupTestRepositoryEnvironment("demo");
	const sources = scope.get(SourceManager);
	const upload = sources.beginUpload();

	const artifactId = await upload.add({
		originalName: "measurement ä.csv",
		mediaType: "text/csv",
		source: new Blob(["a,b\n1,2\n3,4"]).stream(),
	});

	const uploadId = await upload.commit(scope.get(Security).userId);

	return { scope, uploadId, artifactId };
}
