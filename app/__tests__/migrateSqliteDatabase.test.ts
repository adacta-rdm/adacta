import { describe, expect, test } from "bun:test";

import { eq, sql } from "drizzle-orm";

import { migrateSqliteDatabase } from "~/app/.server/migrateSqliteDatabase.ts";
import { sqliteDatabasePath } from "~/app/.server/sqliteDatabase.ts";
import { PID_EDGE_KINDS } from "~/app/lib/PID.ts";
import { QUANTITY_KINDS } from "~/app/lib/quantities.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { setupTestPersistenceEnvironment, signUpTestUser } from "~/app/testUtils/testUtils.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Channel } from "~/drizzle/schema/Channel.ts";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";
import { Manufacturer } from "~/drizzle/schema/Manufacturer.ts";
import { PIDEdgeKind } from "~/drizzle/schema/PIDEdgeKind.ts";
import { Product } from "~/drizzle/schema/Product.ts";
import { QuantityKind } from "~/drizzle/schema/QuantityKind.ts";
import { Env } from "~/lib/env/Env.ts";

const environment = setupTestPersistenceEnvironment;

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
		const message = "Run bun run db:migrations:refresh to regenerate the SQL baseline.";
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
