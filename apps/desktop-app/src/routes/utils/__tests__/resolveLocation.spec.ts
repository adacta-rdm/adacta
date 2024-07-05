import { describe, test, expect } from "vitest";

import type { RouteDef } from "../../../routes";
import { resolveLocation } from "../resolveLocation";

describe("resolveLocation", () => {
	test("resolves location correctly", () => {
		const route: RouteDef = "/repositories/:repositoryId/devices/:deviceId/";
		const params = { repositoryId: "123", deviceId: "456" };
		const expected = "/repositories/123/devices/456/";
		expect(resolveLocation(route, params)).toBe(expected);
	});

	test("handles a route without parameters", () => {
		const route: RouteDef = "/repositories";
		const expected = "/repositories";
		expect(resolveLocation(route)).toBe(expected);
	});

	test("should throw an error if a parameter is missing", () => {
		const route: RouteDef = "/repositories/:repositoryId/devices/:deviceId/";
		const params = { repositoryId: "123" };

		expect(() => resolveLocation(route, params as any)).toThrow("deviceId");
	});
});
