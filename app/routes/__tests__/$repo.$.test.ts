import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/$repo.$";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs";
import { setupTestRepositoryEnvironment } from "~/app/testUtils/testUtils";

describe("repository catch-all loader", () => {
	test("reports the address that names no page", async () => {
		const scope = await setupTestRepositoryEnvironment("demo");
		const [args] = createMiddlewareArgs(scope, {
			request: new Request("http://localhost/demo/nonsense"),
			params: { repo: "demo", "*": "nonsense" },
		});

		const thrown = await Promise.resolve()
			.then(() => loader(args))
			.catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(Response);
		expect((thrown as Response).status).toBe(404);
		expect(await (thrown as Response).text()).toBe('There is no page at "demo/nonsense".');
	});
});
