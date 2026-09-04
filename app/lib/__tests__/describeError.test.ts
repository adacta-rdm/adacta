import { describe, expect, test } from "bun:test";

import { describeError } from "~/app/lib/error/describeError";

/**
 * A route error as React Router presents it. "internal" is true for the errors
 * React Router generates itself.
 */
function routeError(status: number, statusText: string, data: unknown, internal = false) {
	return { status, statusText, internal, data };
}

describe("describeError", () => {
	test("shows the sentence a loader threw", () => {
		const thrown = routeError(404, "", 'Inventory entry "methanation" not found.');

		expect(describeError(thrown)).toEqual({
			status: 404,
			title: "Not found",
			message: 'Inventory entry "methanation" not found.',
		});
	});

	test("replaces the message React Router writes for itself", () => {
		// React Router names the route and the URL. That is for a developer.
		const generated = routeError(404, "Not Found", 'No route matches URL "/demo/nonsense"', true);

		expect(describeError(generated)).toEqual({
			status: 404,
			title: "Not found",
			message: "The page you asked for does not exist.",
		});
	});

	test("names a refused page", () => {
		expect(describeError(routeError(403, "Forbidden", "", true))).toEqual({
			status: 403,
			title: "No access",
			message: "You do not have permission to open this page.",
		});
	});

	test("falls back for a status it does not name", () => {
		expect(describeError(routeError(500, "Unknown Server Error", "", true))).toEqual({
			status: 500,
			title: "Something went wrong",
			message: "The page could not be loaded.",
		});
	});

	test("describes a value that is not a route error", () => {
		expect(describeError(new Error("boom"))).toEqual({
			status: undefined,
			title: "Something went wrong",
			message: "The page could not be loaded.",
		});
	});
});
