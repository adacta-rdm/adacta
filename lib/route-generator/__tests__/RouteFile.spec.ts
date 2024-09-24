import { describe, test, expect } from "vitest";

import { readRoutesForTesting } from "./readRoutesForTesting";
import { RouteFile } from "../RouteFile";

const routes = readRoutesForTesting(
	"_index.tsx",
	"repositories.$repositoryId._index.tsx",
	"repositories.$repositoryId.devices._index.tsx"
);

function getInstance(route: keyof typeof routes, fileContents = routes[route]) {
	return new RouteFile(route, fileContents);
}

describe("RouteFile", () => {
	describe("getRouteName()", () => {
		test("handles file paths", () => {
			const file = new RouteFile("/abs/path/to/routes/repositories.$repositoryId._index.tsx", "");

			expect(file.getRouteName()).toBe("/repositories/:repositoryId/");
		});

		test("converts '_index' to /", () => {
			const file = getInstance("_index.tsx");

			expect(file.getRouteName()).toBe("/");
		});

		test("converts 'repositories.$repositoryId._index' to /repositories/:repositoryId/", () => {
			const file = getInstance("repositories.$repositoryId._index.tsx");

			expect(file.getRouteName()).toBe("/repositories/:repositoryId/");
		});
	});

	describe("getParamsTypeText()", () => {
		test("returns the type Record<string, never> for routes without params", () => {
			const file = getInstance("_index.tsx");

			expect(file.getParamsTypeText()).toBe("Record<string, never>");
		});

		test("returns an array of params for routes with params", () => {
			const file = getInstance("repositories.$repositoryId._index.tsx");

			expect(file.getParamsTypeText()).toBe("{ repositoryId: string }");
		});
	});

	describe("getQueryParams()", () => {
		test("returns an empty object for routes without query parameters", () => {
			const file = getInstance("_index.tsx");

			expect(file.getQueryParams()).toEqual({});
		});

		test("returns an object with query parameters for routes with query parameters", () => {
			const file = getInstance(
				"_index.tsx",
				"export type QueryParams = { search: string; results: number; ids: string[] };"
			);

			expect(file.getQueryParams()).toEqual({ search: true, results: false, ids: false });
		});
	});

	describe("isNestedRouteOf()", () => {
		test("returns true if the file is a nested route of the given file", () => {
			const root = getInstance("_index.tsx");
			const nested = getInstance("repositories.$repositoryId.devices._index.tsx");

			expect(nested.isNestedRouteOf(root)).toBe(true);
		});
	});

	describe("getFileWithUpdatedImports()", () => {
		test("returns the file contents if the file does not contain a `getData` function", () => {
			const file = getInstance("_index.tsx");

			expect(file.getFileWithUpdatedImports("@")).toBe(routes["_index.tsx"]);
		});

		test("updates the type import statement if the file already has one", () => {
			const file = getInstance(
				"repositories.$repositoryId.devices._index.tsx",
				["import { GetDataArgs } from 'wrong/path'", "export function getData() {}"].join("\n")
			);

			expect(file.getFileWithUpdatedImports("@")).toMatchInlineSnapshot(`
				"import { GetDataArgs } from 'wrong/path'
				export function getData() {}"
			`);
		});

		test("updates multiple separate type import statements", () => {
			const file = getInstance(
				"repositories.$repositoryId.devices._index.tsx",
				[
					"import { GetDataArgs } from '@/wrong/path'",
					"import type { Props as GeneratedProps } from '@/wrong/path'",
					"import type { PropsWithChildren } from '@/wrong/path'",
					"import type { Props } from 'wrong/path'",
					"export function getData() {}",
				].join("\n")
			);

			expect(file.getFileWithUpdatedImports("@")).toMatchInlineSnapshot(`
				"import { GetDataArgs } from "@/repositories.$repositoryId.devices._index"
				import type { Props as GeneratedProps } from "@/repositories.$repositoryId.devices._index"
				import type { PropsWithChildren } from "@/repositories.$repositoryId.devices._index"
				import type { Props } from 'wrong/path'
				export function getData() {}"
			`);
		});
	});

	describe("declarations", () => {
		test("declarations.getData is true if the file exports a `getData` function", () => {
			expect(getInstance("_index.tsx", "export function getData() {}").declarations.getData).toBe(
				true
			);
			expect(getInstance("_index.tsx", "function getData() {}").declarations.getData).toBe(true);
		});

		test("declarations.redirect is true if the file exports a `redirect` variable", () => {
			expect(getInstance("_index.tsx", "export const redirect = '/';").declarations.redirect).toBe(
				true
			);
			expect(getInstance("_index.tsx", "const redirect = '/';").declarations.redirect).toBe(false);
		});

		test("declarations.QueryParams is true if the file exports a `QueryParams` type", () => {
			expect(
				getInstance("_index.tsx", "export type QueryParams = { search?: string };").declarations
					.QueryParams
			).toBe(true);
			expect(
				getInstance("_index.tsx", "type QueryParams = { search: string; }").declarations.QueryParams
			).toBe(false);
		});

		test("declarations.default is true if the file declares a function as default export", () => {
			expect(getInstance("_index.tsx", "export default function() {}").declarations.default).toBe(
				true
			);
			expect(getInstance("_index.tsx", "function() {}").declarations.default).toBe(false);
		});

		test("declarations.LoadingState is true if the file exports a `Fallback` variable", () => {
			expect(
				getInstance("_index.tsx", "export function LoadingState { return <div>Loading...</div>; }")
					.declarations.LoadingState
			).toBe(true);
			expect(
				getInstance("_index.tsx", "export const LoadingState = <div>Loading...</div>;").declarations
					.LoadingState
			).toBe(true);
			expect(
				getInstance("_index.tsx", "const LoadingState = <div>Loading...</div>;").declarations
					.LoadingState
			).toBe(false);
		});
	});
});
