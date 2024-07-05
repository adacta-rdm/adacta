import { describe, test, expect } from "vitest";

import { sortDeviceDefinitions } from "../sortDeviceDefinitions";

describe("sortDeviceDefinitions", () => {
	test("Sorts device definitions by their parent definitions", () => {
		const input = [
			{
				name: "Undefined",
				definitions: [
					{ level: 0, definition: { name: "Undefined" } },
					{ level: 1, definition: { name: "Root" } },
				],
			},
			{
				name: "FTIR",
				definitions: [
					{ level: 0, definition: { name: "FTIR" } },
					{ level: 1, definition: { name: "Analytic" } },
					{ level: 2, definition: { name: "Root" } },
				],
			},
			{
				name: "Root",
				definitions: [{ level: 0, definition: { name: "Root" } }],
			},
			{
				name: "Analytic",
				definitions: [
					{ level: 0, definition: { name: "Analytic" } },
					{ level: 1, definition: { name: "Root" } },
				],
			},
			{
				name: "None",
				definitions: [{ level: 0, definition: { name: "None" } }],
			},
			{
				name: "Mass Spectrometer",
				definitions: [
					{ level: 0, definition: { name: "Mass Spectrometer" } },
					{ level: 1, definition: { name: "Analytic" } },
					{ level: 2, definition: { name: "Root" } },
				],
			},
		];

		const expected = [
			{
				name: "None",
				definitions: [{ level: 0, definition: { name: "None" } }],
			},
			{
				name: "Root",
				definitions: [{ level: 0, definition: { name: "Root" } }],
			},
			{
				name: "Analytic",
				definitions: [
					{ level: 0, definition: { name: "Analytic" } },
					{ level: 1, definition: { name: "Root" } },
				],
			},
			{
				name: "FTIR",
				definitions: [
					{ level: 0, definition: { name: "FTIR" } },
					{ level: 1, definition: { name: "Analytic" } },
					{ level: 2, definition: { name: "Root" } },
				],
			},
			{
				name: "Mass Spectrometer",
				definitions: [
					{ level: 0, definition: { name: "Mass Spectrometer" } },
					{ level: 1, definition: { name: "Analytic" } },
					{ level: 2, definition: { name: "Root" } },
				],
			},
			{
				name: "Undefined",
				definitions: [
					{ level: 0, definition: { name: "Undefined" } },
					{ level: 1, definition: { name: "Root" } },
				],
			},
		];

		const result = sortDeviceDefinitions(input);

		expect(result).toEqual(expected);
	});

	test("Works with similar prefix", () => {
		const input = [
			{
				name: "DoesNotMatter",
				definitions: [
					{ level: 2, definition: { name: "Pre" } },
					{ level: 1, definition: { name: "fix" } },
					{ level: 0, definition: { name: "1" } },
				],
			},
			{
				name: "DoesNotMatter",
				definitions: [
					{ level: 1, definition: { name: "Prefix" } },
					{ level: 0, definition: { name: "1" } },
				],
			},
			{
				name: "DoesNotMatter",
				definitions: [
					{ level: 1, definition: { name: "Prefix" } },
					{ level: 0, definition: { name: "2" } },
				],
			},
		];

		const result = sortDeviceDefinitions(input);
		expect(result).toEqual(input);
	});
});
