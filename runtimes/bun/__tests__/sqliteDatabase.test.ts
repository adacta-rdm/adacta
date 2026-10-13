import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { eq, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PID_EDGE_KINDS } from "~/app/lib/PID.ts";
import { QUANTITY_KINDS } from "~/app/lib/quantities.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { signUpTestUser } from "~/app/testUtils/testUtils.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { PIDEdgeKind } from "~/drizzle/schema/PIDEdgeKind.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { QuantityKind } from "~/drizzle/schema/QuantityKind.ts";
import { Env } from "~/lib/env/Env.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";
import { migrateSqliteDatabase, sqliteDatabasePath } from "~/runtimes/bun/sqliteDatabase.ts";
import { createTestAppContainer } from "~/runtimes/bun/testEnvironment.ts";

/**
 * Converts a synchronous driver error into a promise rejection.
 */
async function settle<T>(query: () => Promise<T>): Promise<T> {
	return await query();
}

const environment = createTestAppContainer;
const BatchTest = sqliteTable("batch_test", {
	id: integer("id").primaryKey(),
	name: text("name").notNull().unique(),
});

function dbPath(container: ServiceContainer) {
	return join(container.get(Env).string("ADACTA_DB_DIR"), "adacta.sqlite");
}

describe("local SQLite connection", () => {
	describe("openSqliteDatabase", () => {
		test("writes the file into the configured directory", () => {
			const container = environment();

			container.get(ApplicationDatabase);

			expect(existsSync(dbPath(container))).toBe(true);
		});

		test("creates the directory when it does not exist", () => {
			const nested = join(environment().get(Env).string("ADACTA_DB_DIR"), "nested");
			const container = environment({ ADACTA_DB_DIR: nested });

			container.get(ApplicationDatabase);

			expect(existsSync(dbPath(container))).toBe(true);
		});

		test("enforces foreign keys", async () => {
			const db = environment().get(ApplicationDatabase);
			await db.run(sql`CREATE TABLE parent (id integer primary key)`);
			await db.run(sql`CREATE TABLE child (parent_id integer references parent(id))`);

			const insert = settle(() => db.run(sql`INSERT INTO child (parent_id) VALUES (1)`));

			await expect(insert).rejects.toThrow();
		});

		test("leaves migration explicit when opening", async () => {
			const db = environment().get(ApplicationDatabase);

			await expect(settle(() => db.select().from(InventoryEntry).all())).rejects.toThrow();
		});
	});

	describe("batch", () => {
		test("writes every statement and reports changes in order", async () => {
			const db = environment().get(ApplicationDatabase);
			await db.run(
				sql`CREATE TABLE batch_test (id integer primary key, name text not null unique)`,
			);

			const results = await db.batch([
				db.insert(BatchTest).values([
					{ id: 1, name: "first" },
					{ id: 2, name: "second" },
				]),
				db.delete(BatchTest).where(sql`${BatchTest.name} = 'first'`),
				db.insert(BatchTest).values({ id: 3, name: "third" }),
			]);

			expect(results).toEqual([{ changes: 2 }, { changes: 1 }, { changes: 1 }]);
			expect((await db.select().from(BatchTest).all()).map((row) => row.name)).toEqual([
				"second",
				"third",
			]);
		});

		test("rolls back earlier statements when a later statement fails", async () => {
			const db = environment().get(ApplicationDatabase);
			await db.run(
				sql`CREATE TABLE batch_test (id integer primary key, name text not null unique)`,
			);

			await expect(
				db.batch([
					db.insert(BatchTest).values({ id: 1, name: "same" }),
					db.insert(BatchTest).values({ id: 2, name: "same" }),
				]),
			).rejects.toThrow();
			expect(await db.select().from(BatchTest).all()).toEqual([]);
		});

		test("accepts an empty list", async () => {
			const db = environment().get(ApplicationDatabase);
			expect(await db.batch([])).toEqual([]);
		});
	});

	describe("migrateSqliteDatabase", () => {
		test("creates authentication and laboratory tables in one file", async () => {
			const container = environment();

			migrateSqliteDatabase(sqliteDatabasePath(container.get(Env)));

			const db = container.get(ApplicationDatabase);
			expect(await db.select().from(User).all()).toEqual([]);
			expect(await db.select().from(InventoryEntry).all()).toEqual([]);
		});

		test("the SQL baseline holds exactly the kinds the application lists", async () => {
			const container = environment();

			migrateSqliteDatabase(sqliteDatabasePath(container.get(Env)));

			const db = container.get(ApplicationDatabase);
			const quantityKinds = (await db.select().from(QuantityKind).all())
				.map((kind) => kind.id)
				.sort();
			const edgeKinds = (await db.select().from(PIDEdgeKind).all()).map((kind) => kind.id).sort();
			const message = "Run bun run migrations:baseline to rebuild the SQL baseline.";
			expect(quantityKinds, message).toEqual(Object.keys(QUANTITY_KINDS).sort());
			expect(edgeKinds, message).toEqual(Object.keys(PID_EDGE_KINDS).sort());
		});

		test("preserves records and lookup names when migrating again", async () => {
			const container = environment();
			const path = sqliteDatabasePath(container.get(Env));
			migrateSqliteDatabase(path);
			const db = container.get(ApplicationDatabase);
			await db.run(sql`CREATE TABLE preserved (value text)`);
			await db.run(sql`INSERT INTO preserved VALUES ('saved')`);
			await db.insert(QuantityKind).values({ id: "LuminousFlux" });
			await db.insert(PIDEdgeKind).values({ id: "dotted" });
			const quantities = await db.select().from(QuantityKind).all();
			const edges = await db.select().from(PIDEdgeKind).all();

			migrateSqliteDatabase(path);

			expect(await db.all(sql`SELECT * FROM preserved`)).toEqual([{ value: "saved" }]);
			expect(await db.select().from(QuantityKind).all()).toEqual(quantities);
			expect(await db.select().from(PIDEdgeKind).all()).toEqual(edges);
		});

		describe("quantity kinds", () => {
			async function database() {
				const container = environment();
				migrateSqliteDatabase(sqliteDatabasePath(container.get(Env)));

				const db = container.get(ApplicationDatabase);
				const metadata = {
					metadataCreatorId: await signUpTestUser(container),
					metadataCreationTimestamp: new Date(),
				};

				const manufacturer = await db
					.insert(Manufacturer)
					.values({ slug: "bronkhorst", name: "Bronkhorst", ...metadata })
					.returning()
					.get();

				const product = await db
					.insert(Product)
					.values({
						manufacturerId: manufacturer.id,
						slug: "f-201cv",
						name: "F-201CV",
						productNumber: "F-201CV",
						subtitle: "Mass flow controller",
						...metadata,
					})
					.returning()
					.get();

				const addChannel = async (quantityKindId: string | null) =>
					await db
						.insert(Channel)
						.values({
							productId: product.id,
							position: 0,
							key: "flow",
							role: "measurement",
							quantityKindId,
							...metadata,
						})
						.returning()
						.get();

				return { db, addChannel };
			}

			test("a channel cannot name a kind that is not there", async () => {
				const { addChannel } = await database();

				await expect(addChannel("SpaceVelocity")).rejects.toThrow();
			});

			test("a kind cannot be removed while a channel names it", async () => {
				const { db, addChannel } = await database();
				await addChannel("VolumeFlowRate");

				expect(() =>
					db.delete(QuantityKind).where(eq(QuantityKind.id, "VolumeFlowRate")).run(),
				).toThrow();
			});

			test("a renamed kind carries its channels with it", async () => {
				const { db, addChannel } = await database();
				const channel = await addChannel("VolumeFlowRate");

				await db
					.update(QuantityKind)
					.set({ id: "VolumetricFlowRate" })
					.where(eq(QuantityKind.id, "VolumeFlowRate"))
					.run();

				expect(
					(await db.select().from(Channel).where(eq(Channel.id, channel.id)).get())?.quantityKindId,
				).toBe("VolumetricFlowRate");
			});
		});
	});
});
