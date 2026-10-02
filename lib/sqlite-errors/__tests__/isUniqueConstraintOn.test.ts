import { Database as SQLite } from "bun:sqlite";
import { describe, expect, test } from "bun:test";

import { drizzle } from "drizzle-orm/bun-sqlite";
import { sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

import { isUniqueConstraintOn } from "~/lib/sqlite-errors/isUniqueConstraintOn.ts";

const Person = sqliteTable(
	"Person",
	{
		id: text("id").primaryKey(),
		email: text("email").notNull(),
		team: text("team").notNull(),
		nickname: text("nickname").notNull(),
	},
	(table) => [unique().on(table.email), unique().on(table.team, table.nickname)],
);

function database() {
	const client = new SQLite(":memory:");
	client.run(`CREATE TABLE Person (
		id text PRIMARY KEY,
		email text NOT NULL UNIQUE,
		team text NOT NULL,
		nickname text NOT NULL,
		UNIQUE (team, nickname)
	)`);

	const db = drizzle({ client });
	db.insert(Person).values({ id: "1", email: "ada@example.com", team: "a", nickname: "ada" }).run();
	return db;
}

function errorOf(insert: () => unknown): unknown {
	try {
		insert();
	} catch (error) {
		return error;
	}
	throw new Error("The insert succeeded.");
}

describe("isUniqueConstraintOn", () => {
	test("recognizes a unique constraint on one column", () => {
		const db = database();
		const error = errorOf(() =>
			db
				.insert(Person)
				.values({ id: "2", email: "ada@example.com", team: "b", nickname: "x" })
				.run(),
		);

		expect(isUniqueConstraintOn(error, [Person.email])).toBe(true);
	});

	test("recognizes both columns of a unique constraint in either order", () => {
		const db = database();
		const error = errorOf(() =>
			db
				.insert(Person)
				.values({ id: "2", email: "bob@example.com", team: "a", nickname: "ada" })
				.run(),
		);

		expect(isUniqueConstraintOn(error, [Person.team, Person.nickname])).toBe(true);
		expect(isUniqueConstraintOn(error, [Person.nickname, Person.team])).toBe(true);
	});

	test("recognizes one column of a unique constraint on two columns", () => {
		const db = database();
		const error = errorOf(() =>
			db
				.insert(Person)
				.values({ id: "2", email: "bob@example.com", team: "a", nickname: "ada" })
				.run(),
		);

		expect(isUniqueConstraintOn(error, [Person.nickname])).toBe(true);
	});

	test.each([
		{ id: "2", email: "ada@example.com", team: "b", nickname: "x" },
		{ id: "2", email: "bob@example.com", team: "a", nickname: "ada" },
	])("recognizes any unique constraint when columns are omitted: %j", (values) => {
		const db = database();
		const error = errorOf(() => db.insert(Person).values(values).run());

		expect(isUniqueConstraintOn(error)).toBe(true);
		expect(isUniqueConstraintOn(error, [])).toBe(true);
	});

	test("recognizes a duplicate primary key when columns are omitted", () => {
		const db = database();
		const error = errorOf(() =>
			db
				.insert(Person)
				.values({ id: "1", email: "bob@example.com", team: "b", nickname: "x" })
				.run(),
		);

		expect(isUniqueConstraintOn(error)).toBe(true);
		expect(isUniqueConstraintOn(error, [Person.id])).toBe(true);
		expect(isUniqueConstraintOn(error, [Person.email])).toBe(false);
		expect(isUniqueConstraintOn(error, [Person.nickname])).toBe(false);
	});

	test("rejects a unique constraint on other columns", () => {
		const db = database();
		const error = errorOf(() =>
			db
				.insert(Person)
				.values({ id: "2", email: "ada@example.com", team: "b", nickname: "x" })
				.run(),
		);

		expect(isUniqueConstraintOn(error, [Person.nickname])).toBe(false);
		expect(isUniqueConstraintOn(error, [Person.email, Person.nickname])).toBe(false);
	});

	test("rejects a column of another table with the same column name", () => {
		const OtherPerson = sqliteTable("OtherPerson", { email: text("email") });
		const db = database();
		const error = errorOf(() =>
			db
				.insert(Person)
				.values({ id: "2", email: "ada@example.com", team: "b", nickname: "x" })
				.run(),
		);

		expect(isUniqueConstraintOn(error, [OtherPerson.email])).toBe(false);
	});

	test("rejects an error that is not a constraint failure", () => {
		expect(isUniqueConstraintOn(new Error("Disk full."), [Person.email])).toBe(false);
		expect(isUniqueConstraintOn(new Error("Disk full."))).toBe(false);
	});
});
