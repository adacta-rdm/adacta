import type { RouteObject } from "found";
import { describe, test, expect } from "vitest";

import { configureRoutes } from "../configureRoutes";

describe("configureRoutes()", () => {
	test("snapshot", () => {
		const input: Record<string, RouteObject | string> = {
			"/": "/repositories", // Redirect
			"/login": {},
			"/repositories": {},
			"/repositories/": {}, // Index route
			"/repositories/new": {}, // New repository
			"/long/path/to/somewhere": {}, // Route with intermediates not explicitly defined
		};

		const output = configureRoutes(input);

		expect(output).toMatchSnapshot();
	});

	test("static path names have precedence over variable path parts", () => {
		const input: Record<string, RouteObject | string> = {
			"/": "/repositories", // Redirect
			"/login": {},
			"/user/:id": {}, // Variable path
			"/user/static": {}, // Static path
		};

		const output = configureRoutes(input);

		// Find the indices of the static and variable paths
		const staticPathIndex = output.findIndex((route) => route.path === "/user/static");
		const variablePathIndex = output.findIndex((route) => route.path === "/user/:id");

		// The static path should come before the variable path
		expect(staticPathIndex).toBeLessThan(variablePathIndex);
	});
});
