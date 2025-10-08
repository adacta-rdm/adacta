import { describe, expect, test } from "vitest";

import { PlainTextTable } from "../TablePrinter";

describe("TablePrinter", () => {
	test("should print a table", () => {
		// Arrange
		const table = new PlainTextTable();
		table.addRow(["Name", "Age"]);
		table.addRow(["Alice", "30"]);
		table.addRow(["Bob", "25"]);
		table.addRow(["Charlie", "35"]);

		const result = table.getTable();

		expect(result).toBe("Name    Age\nAlice   30 \nBob     25 \nCharlie 35 \n");
	});

	test("supports multiline columns", () => {
		// Arrange
		const table = new PlainTextTable();
		table.addRow(["Name", "Description"]);
		table.addRow(["A\nB", "Foo"]);
		table.addRow(["Bar", "Test\nTest2"]);
		table.addRow(["Foo\nBaz", "Bar\nBaz"]);
		table.addRow(["Foo\nBaz", "Bar\nBaU\nBaz"]);

		const result = table.getTable();

		expect(result).toBe(
			"Name Description\n" +
				"A    Foo        \n" +
				"B               \n" +
				"Bar  Test       \n" +
				"     Test2      \n" +
				"Foo  Bar        \n" +
				"Baz  Baz        \n" +
				"Foo  Bar        \n" +
				"Baz  BaU        \n" +
				"     Baz        \n"
		);
	});
});
