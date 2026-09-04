import { describe, expect, test } from "bun:test";

import {
	FormValues,
	InvalidFormFieldTypeError,
	MissingFormFieldError,
} from "~/lib/form-values/FormValues";

function values(fields: Record<string, string>): FormValues {
	const form = new FormData();
	for (const [name, value] of Object.entries(fields)) form.set(name, value);

	return new FormValues(form);
}

describe("FormValues", () => {
	describe("string", () => {
		test("trims the submitted text", () => {
			expect(values({ name: "  Pt batch  " }).string("name")).toBe("Pt batch");
		});

		test("reports a field that was not submitted", () => {
			// An input the form never sent is a fault in the form. A person did not do
			// it. It must therefore not read as a blank answer.
			expect(() => values({}).string("name")).toThrow(MissingFormFieldError);
			expect(() => values({}).string("name")).toThrow(/name/);
		});

		test("reads a blank field as empty", () => {
			expect(values({ name: "   " }).string("name")).toBe("");
		});

		test("takes the fallback for a field that was not submitted", () => {
			expect(values({}).string("support", null)).toBeNull();
		});

		test("takes the fallback when the field is blank", () => {
			expect(values({ support: "  " }).string("support", null)).toBeNull();
			expect(values({}).string("support", null)).toBeNull();
			expect(values({ support: "Al2O3" }).string("support", null)).toBe("Al2O3");
		});
	});

	describe("integer", () => {
		test("reads a whole number", () => {
			const value: number = values({ delete: " 42 " }).integer("delete");

			expect(value).toBe(42);
		});

		test("reports a field that was not submitted", () => {
			expect(() => values({}).integer("delete")).toThrow(MissingFormFieldError);
			expect(() => values({}).integer("delete")).toThrow(/delete/);
		});

		test("takes the fallback when the field is blank or absent", () => {
			const optional: number | undefined = values({}).integer("delete", undefined);

			expect(optional).toBeUndefined();
			expect(values({ delete: "  " }).integer("delete", 0)).toBe(0);
			expect(values({}).integer("delete", 0)).toBe(0);
		});

		test("rejects an invalid integer", () => {
			// A negative number is not expected here. The identifiers this reads are
			// database keys. They count upwards.
			expect(() => values({ delete: "12x" }).integer("delete")).toThrow(InvalidFormFieldTypeError);
			expect(() => values({ delete: "12x" }).integer("delete", 0)).toThrow(
				InvalidFormFieldTypeError,
			);
			expect(() => values({ delete: "-1" }).integer("delete")).toThrow(InvalidFormFieldTypeError);
			expect(() => values({ delete: "  " }).integer("delete")).toThrow(InvalidFormFieldTypeError);
		});
	});

	describe("has", () => {
		test("reports whether the field was submitted", () => {
			expect(values({ add: "" }).has("add")).toBe(true);
			expect(values({}).has("add")).toBe(false);
		});
	});
});
