/**
 * Tests the ApplicationDatabase of the selected runtime. Each database driver
 * reports a constraint failure in its own form. The runtime translates it, so
 * every runtime must pass these tests unchanged.
 */
import { describe, expect, test } from "bun:test";

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { setupEmptyTestDatabaseEnvironment } from "~/app/testUtils/testUtils.ts";
import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";

const Person = sqliteTable("Person", {
	id: text("id").primaryKey(),
	email: text("email").notNull(),
	team: text("team").notNull(),
	nickname: text("nickname").notNull(),
});

const Badge = sqliteTable("Badge", {
	id: integer("id").primaryKey(),
	personId: text("person_id").notNull(),
});

const ADA = { id: "1", email: "ada@example.com", team: "a", nickname: "ada" };

/**
 * Returns a migrated database with the tables Person and Badge. Person holds
 * one row, ADA.
 */
async function database(): Promise<ApplicationDatabase> {
	const db = (await setupEmptyTestDatabaseEnvironment()).get(ApplicationDatabase);

	await db.run(sql`CREATE TABLE Person (
		id text PRIMARY KEY,
		email text NOT NULL UNIQUE,
		team text NOT NULL,
		nickname text NOT NULL,
		UNIQUE (team, nickname)
	)`);
	await db.run(sql`CREATE TABLE Badge (
		id integer PRIMARY KEY,
		person_id text NOT NULL REFERENCES Person (id)
	)`);
	await db.insert(Person).values(ADA);

	return db;
}

async function errorOf(write: PromiseLike<unknown>): Promise<unknown> {
	try {
		await write;
	} catch (error) {
		return error;
	}
	throw new Error("The write succeeded.");
}

describe("ApplicationDatabase", () => {
	describe("a write that breaks a unique constraint", () => {
		test("rejects with the columns of a constraint on one column", async () => {
			const db = await database();

			const error = await errorOf(
				db.insert(Person).values({ ...ADA, id: "2", team: "b", nickname: "x" }),
			);

			expect(error).toBeInstanceOf(UniqueConstraintViolationError);
			expect((error as UniqueConstraintViolationError).columns).toEqual(["Person.email"]);
		});

		test("rejects with the columns of a constraint on two columns", async () => {
			const db = await database();

			const error = await errorOf(
				db.insert(Person).values({ ...ADA, id: "2", email: "bob@example.com" }),
			);

			expect(error).toBeInstanceOf(UniqueConstraintViolationError);
			expect((error as UniqueConstraintViolationError).columns).toEqual([
				"Person.team",
				"Person.nickname",
			]);
		});

		test("rejects with the column of a duplicate primary key", async () => {
			const db = await database();

			const error = await errorOf(
				db.insert(Person).values({ ...ADA, email: "bob@example.com", team: "b", nickname: "x" }),
			);

			expect(error).toBeInstanceOf(UniqueConstraintViolationError);
			expect((error as UniqueConstraintViolationError).columns).toEqual(["Person.id"]);
		});

		test("rejects in the same way inside a batch", async () => {
			const db = await database();

			const error = await errorOf(
				db.batch([db.insert(Person).values({ ...ADA, id: "2", team: "b", nickname: "x" })]),
			);

			expect(error).toBeInstanceOf(UniqueConstraintViolationError);
			expect((error as UniqueConstraintViolationError).columns).toEqual(["Person.email"]);
		});
	});

	test("rejects a write that breaks a foreign key with the driver's error", async () => {
		const db = await database();

		const error = await errorOf(db.insert(Badge).values({ id: 1, personId: "missing" }));

		expect(error).toBeInstanceOf(Error);
		expect(error).not.toBeInstanceOf(UniqueConstraintViolationError);
	});
});
