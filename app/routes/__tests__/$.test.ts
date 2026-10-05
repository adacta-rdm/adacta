import { describe, expect, test } from "bun:test";

import { loader } from "~/app/routes/$.tsx";
import { createMiddlewareArgs } from "~/app/testUtils/createMiddlewareArgs.ts";
import { setupTestRequestScope } from "~/app/testUtils/testUtils.ts";

describe("$", () => {
	describe("loader", () => {
		test("reports the address that names no page", async () => {
			const scope = await setupTestRequestScope();
			const [args] = createMiddlewareArgs(scope, {
				request: new Request("http://localhost/nonsense"),
				params: { "*": "nonsense" },
			});

			const thrown = await Promise.resolve()
				.then(() => loader(args))
				.catch((error: unknown) => error);

			expect(thrown).toBeInstanceOf(Response);
			expect((thrown as Response).status).toBe(404);
			expect(await (thrown as Response).text()).toBe('There is no page at "/nonsense".');
		});
	});
});
