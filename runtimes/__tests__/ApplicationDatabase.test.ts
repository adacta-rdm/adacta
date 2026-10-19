/**
 * Tests the ApplicationDatabase of the selected runtime. Each database driver
 * reports a constraint failure in its own form. The runtime translates it, so
 * every runtime must pass these tests unchanged.
 *
 * A synchronous driver throws when a write fails, and an asynchronous driver
 * rejects. Each test therefore passes its write to Promise.resolve. The write
 * then runs once, and a thrown error becomes a rejection. For example, a test
 * can check the class and the columns of the same rejection.
 */
import { describe, expect, test } from "bun:test";

import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { setupEmptyTestDatabaseEnvironment } from "~/app/testUtils/testUtils.ts";
import { ForeignKeyViolationError } from "~/lib/sqlite-errors/ForeignKeyViolationError.ts";
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

describe("ApplicationDatabase", () => {
	describe("a write that breaks a unique constraint", () => {
		test("rejects with the columns of a constraint on one column", async () => {
			const db = await database();

			const result = Promise.resolve(
				db.insert(Person).values({ ...ADA, id: "2", team: "b", nickname: "x" }),
			);

			await expect(result).rejects.toBeInstanceOf(UniqueConstraintViolationError);
			await expect(result).rejects.toMatchObject({ columns: ["Person.email"] });
		});

		test("rejects with the columns of a constraint on two columns", async () => {
			const db = await database();

			const result = Promise.resolve(
				db.insert(Person).values({ ...ADA, id: "2", email: "bob@example.com" }),
			);

			await expect(result).rejects.toBeInstanceOf(UniqueConstraintViolationError);
			await expect(result).rejects.toMatchObject({ columns: ["Person.team", "Person.nickname"] });
		});

		test("rejects with the column of a duplicate primary key", async () => {
			const db = await database();

			const result = Promise.resolve(
				db.insert(Person).values({ ...ADA, email: "bob@example.com", team: "b", nickname: "x" }),
			);

			await expect(result).rejects.toBeInstanceOf(UniqueConstraintViolationError);
			await expect(result).rejects.toMatchObject({ columns: ["Person.id"] });
		});

		test("rejects in the same way inside a batch", async () => {
			const db = await database();

			const result = Promise.resolve(
				db.batch([db.insert(Person).values({ ...ADA, id: "2", team: "b", nickname: "x" })]),
			);

			await expect(result).rejects.toBeInstanceOf(UniqueConstraintViolationError);
			await expect(result).rejects.toMatchObject({ columns: ["Person.email"] });
		});
	});

	test("rejects a write that breaks a foreign key with ForeignKeyViolationError", async () => {
		const db = await database();

		const result = Promise.resolve(db.insert(Badge).values({ id: 1, personId: "missing" }));

		await expect(result).rejects.toBeInstanceOf(ForeignKeyViolationError);
	});
});
