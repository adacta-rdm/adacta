import { describe, test, expect } from "vitest";

import type { Location } from "../resolveLocation";
import { resolveLocation } from "../resolveLocation";

import type { RouteDef } from "@/routes";

// Loosely typed alias to avoid type errors in tests
const resolveLocationUntyped = resolveLocation as (
	route: string,
	params?: object,
	query?: object
) => Location;

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

	test("routes with parameters and query params", () => {
		const route: RouteDef = "/repositories/:repositoryId/devices/:deviceId/";
		const params = { repositoryId: "123", deviceId: "456" };
		const query = { foo: "bar", bar: "baz" };
		const expected = "/repositories/123/devices/456/?foo=bar&bar=baz";
		expect(resolveLocationUntyped(route, params, query)).toBe(expected);
	});

	test("routes with only query params", () => {
		const route: RouteDef = "/repositories";
		const query = { foo: "bar", bar: "baz" };
		const expected = "/repositories?foo=bar&bar=baz";
		expect(resolveLocationUntyped(route, query)).toBe(expected);
	});

	test("serializes query params", () => {
		const route: RouteDef = "/repositories";
		const query = {
			foo: "bar",
			bar: null,
			baz: undefined,
			qux: 123,
			quux: true,
			quuz: false,
			arr: [1, {}, "3"],
			obj: { foo: "bar" },
		};
		//
		const expected =
			'/repositories?foo=bar&bar=null&qux=123&quux=true&quuz=false&arr=[1,{},"3"]&obj={"foo":"bar"}';
		// Note that the undefined value does not appear in the query string.
		expect(resolveLocationUntyped(route, query)).toBe(expected);
	});

	test("should throw an error if a parameter is missing", () => {
		const route: RouteDef = "/repositories/:repositoryId/devices/:deviceId/";
		const params = { repositoryId: "123" };

		expect(() => resolveLocation(route, params as any)).toThrow("deviceId");
	});
});
