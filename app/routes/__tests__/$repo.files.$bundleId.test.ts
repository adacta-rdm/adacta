import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/$repo.files.$bundleId";
import { Security } from "~/app/services/Security";
import { SourceManager } from "~/app/services/SourceManager";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils";

describe("file bundle loader", () => {
	test("returns the original file metadata", async () => {
		const { scope, bundleId } = await setupBundle();
		const request = new Request(`http://localhost/demo/files/${bundleId}`);
		const [args] = createMiddlewareArgs(scope, {
			request,
			params: { repo: "demo", bundleId },
		});

		const result = await loader(args);

		expect(result.bundle.id).toBe(bundleId);
		expect(result.bundle.artifacts).toEqual([
			expect.objectContaining({
				originalName: "measurement ä.csv",
				mediaType: "text/csv",
				byteSize: 11,
			}),
		]);
	});
});

export async function setupBundle() {
	const scope = await setupTestRepositoryEnvironment("demo");
	const sources = scope.get(SourceManager);
	const bundleUpload = sources.beginBundle();
	const artifactId = await bundleUpload.add({
		originalName: "measurement ä.csv",
		mediaType: "text/csv",
		source: new Blob(["a,b\n1,2\n3,4"]).stream(),
	});
	const bundleId = await bundleUpload.commit(scope.get(Security).userId);
	return { scope, bundleId, artifactId };
}
