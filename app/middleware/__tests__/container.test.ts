import { describe, expect, mock, test } from "bun:test";

import { RouterContextProvider } from "react-router";

import { services } from "~/app/.server/context.ts";
import { container } from "~/app/middleware/container.ts";

describe("container", () => {
	test("gives each request its own service container", async () => {
		const first = new RouterContextProvider();
		const second = new RouterContextProvider();

		await container(middlewareArgs(first), mock());
		await container(middlewareArgs(second), mock());

		expect(first.get(services)).not.toBe(second.get(services));
	});
});

/**
 * The arguments of a request that has no service container yet. The helper
 * createMiddlewareArgs always sets one. It therefore does not fit here.
 */
function middlewareArgs(context: RouterContextProvider) {
	const request = new Request("http://localhost/");

	return { request, url: new URL(request.url), pattern: "", params: {}, context };
}
