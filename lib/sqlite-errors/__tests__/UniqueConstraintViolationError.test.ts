import { describe, expect, test } from "bun:test";

import { sqliteTable, text } from "drizzle-orm/sqlite-core";

import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";

const Person = sqliteTable("Person", {
	id: text("id").primaryKey(),
	email: text("email").notNull(),
	team: text("team").notNull(),
	nickname: text("nickname").notNull(),
});

const cause = new Error("The driver's error.");

describe("UniqueConstraintViolationError", () => {
	describe("isOn", () => {
		test("matches the column of a constraint on one column", () => {
			const error = new UniqueConstraintViolationError(["Person.email"], { cause });

			expect(error.isOn([Person.email])).toBe(true);
		});

		test("matches both columns of a constraint in either order", () => {
			const error = new UniqueConstraintViolationError(["Person.team", "Person.nickname"], {
				cause,
			});

			expect(error.isOn([Person.team, Person.nickname])).toBe(true);
			expect(error.isOn([Person.nickname, Person.team])).toBe(true);
		});

		test("matches one column of a constraint on two columns", () => {
			const error = new UniqueConstraintViolationError(["Person.team", "Person.nickname"], {
				cause,
			});

			expect(error.isOn([Person.nickname])).toBe(true);
		});

		test("matches every constraint when no columns are given", () => {
			const error = new UniqueConstraintViolationError(["Person.id"], { cause });

			expect(error.isOn()).toBe(true);
			expect(error.isOn([])).toBe(true);
		});

		test("rejects a constraint on other columns", () => {
			const error = new UniqueConstraintViolationError(["Person.email"], { cause });

			expect(error.isOn([Person.nickname])).toBe(false);
			expect(error.isOn([Person.email, Person.nickname])).toBe(false);
		});

		test("rejects a column of another table with the same column name", () => {
			const OtherPerson = sqliteTable("OtherPerson", { email: text("email") });
			const error = new UniqueConstraintViolationError(["Person.email"], { cause });

			expect(error.isOn([OtherPerson.email])).toBe(false);
		});
	});
});
