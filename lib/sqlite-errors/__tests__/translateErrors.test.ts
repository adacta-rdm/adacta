import { describe, expect, test } from "bun:test";

import { ForeignKeyViolationError } from "~/lib/sqlite-errors/ForeignKeyViolationError.ts";
import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";
import { translateError, withTranslatedErrors } from "~/lib/sqlite-errors/translateErrors.ts";

const cause = new Error("The driver's error.");

describe("translateError", () => {
	test("turns a unique-constraint failure into UniqueConstraintViolationError", () => {
		const error = translateError(cause, () => ["Person.email"]);

		expect(error).toBeInstanceOf(UniqueConstraintViolationError);
		expect(error).toMatchObject({ columns: ["Person.email"], cause });
	});

	test("turns a foreign key failure into ForeignKeyViolationError", () => {
		const error = translateError(cause, () => "foreign-key");

		expect(error).toBeInstanceOf(ForeignKeyViolationError);
		expect(error).toMatchObject({ cause });
	});

	test("returns any other error unchanged", () => {
		const error = translateError(cause, () => undefined);

		expect(error).toBe(cause);
	});
});

describe("withTranslatedErrors", () => {
	test("throws the translated error of a synchronous call", () => {
		const call = () => {
			throw cause;
		};

		const run = () => withTranslatedErrors(call, () => "foreign-key");

		expect(run).toThrow(ForeignKeyViolationError);
	});

	test("rejects with the translated error of an asynchronous call", async () => {
		const call = () => Promise.reject(cause);

		const result = withTranslatedErrors(call, () => "foreign-key");

		await expect(result).rejects.toBeInstanceOf(ForeignKeyViolationError);
	});
});
