import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { eq } from "drizzle-orm";

import { QUANTITY_KINDS } from "~/app/lib/quantities.ts";
import { DatabaseManager, InvalidDatabaseNameError } from "~/app/services/DatabaseManager.ts";
import {
	RepoManager,
	RepositoryAlreadyExistsError,
	RepositoryNotFoundError,
} from "~/app/services/RepoManager.ts";
import { SystemDB } from "~/app/services/SystemDB.ts";
import { setupEmptyTestDatabaseEnvironment, signUpTestUser } from "~/app/testUtils/testUtils.ts";
import { Channel } from "~/drizzle/schema/repo.Channel.ts";
import { InventoryEntry } from "~/drizzle/schema/repo.InventoryEntry.ts";
import { Manufacturer } from "~/drizzle/schema/repo.Manufacturer.ts";
import { Product } from "~/drizzle/schema/repo.Product.ts";
import { QuantityKind } from "~/drizzle/schema/repo.QuantityKind.ts";
import { UserRepository } from "~/drizzle/schema/system.UserRepository.ts";
import { Env } from "~/lib/env/Env.ts";

/**
 * A container with a migrated system database and nothing in it.
 */
const environment = setupEmptyTestDatabaseEnvironment;

describe("RepoManager", () => {
	test("migrateAll is safe to repeat", () => {
		const container = environment();
		container.get(RepoManager).createRepository("demo");

		expect(() => container.get(RepoManager).migrateAll()).not.toThrow();
	});

	test("creates a repository and lists it", () => {
		const manager = environment().get(RepoManager);
		manager.createRepository("demo", "Demo Laboratory");

		expect(manager.repositories()).toEqual(["demo"]);
	});

	test("creates the repository database", () => {
		const container = environment();
		container.get(RepoManager).createRepository("demo");

		const dbDir = container.get(Env).string("ADACTA_DB_DIR");
		expect(existsSync(join(dbDir, "demo.sqlite"))).toBe(true);
	});

	test("migrates the new repository database", () => {
		const container = environment();
		container.get(RepoManager).createRepository("demo");

		// The table only exists if the repo migrations ran.
		const repoDb = container.get(DatabaseManager).repoDb("demo");
		expect(() => repoDb.select().from(InventoryEntry).all()).not.toThrow();
	});

	test("rejects a duplicate repository", () => {
		const manager = environment().get(RepoManager);
		manager.createRepository("demo");

		expect(() => manager.createRepository("demo")).toThrow(RepositoryAlreadyExistsError);
	});

	test.each([["../escape"], ["with space"], ["semi;colon"], [""], ["a/b"]])(
		"rejects unsafe repository name %p",
		(slug) => {
			const manager = environment().get(RepoManager);

			expect(() => manager.createRepository(slug)).toThrow(InvalidDatabaseNameError);
		},
	);

	test("records nothing when the name is rejected", () => {
		const container = environment();

		expect(() => container.get(RepoManager).createRepository("../escape")).toThrow();
		expect(container.get(RepoManager).repositories()).toEqual([]);
	});

	test("grants access", async () => {
		const container = environment();
		const manager = container.get(RepoManager);
		const userId = await signUpTestUser(container);
		manager.createRepository("demo");

		manager.grantAccess(userId, "demo");

		expect(container.get(SystemDB).select().from(UserRepository).all()).toHaveLength(1);
	});

	test("granting twice is not an error", async () => {
		const container = environment();
		const manager = container.get(RepoManager);
		const userId = await signUpTestUser(container);
		manager.createRepository("demo");

		manager.grantAccess(userId, "demo");
		manager.grantAccess(userId, "demo");

		expect(container.get(SystemDB).select().from(UserRepository).all()).toHaveLength(1);
	});

	test("rejects a grant for a repository that does not exist", async () => {
		const container = environment();
		const userId = await signUpTestUser(container);

		expect(() => container.get(RepoManager).grantAccess(userId, "nope")).toThrow(
			RepositoryNotFoundError,
		);
	});

	test("deletes a repository", async () => {
		const container = environment();
		const manager = container.get(RepoManager);
		manager.createRepository("demo");
		manager.createRepository("pilot");

		manager.deleteRepository("demo");

		expect(manager.repositories()).toEqual(["pilot"]);
	});

	test("deletes the repository database", () => {
		const container = environment();
		const manager = container.get(RepoManager);
		manager.createRepository("demo");

		manager.deleteRepository("demo");

		const dbDir = container.get(Env).string("ADACTA_DB_DIR");
		expect(existsSync(join(dbDir, "demo.sqlite"))).toBe(false);
	});

	test("deletes the grants with the repository", async () => {
		const container = environment();
		const manager = container.get(RepoManager);
		const userId = await signUpTestUser(container);
		manager.createRepository("demo");
		manager.grantAccess(userId, "demo");

		manager.deleteRepository("demo");

		expect(container.get(SystemDB).select().from(UserRepository).all()).toEqual([]);
	});

	test("rejects deleting a repository that does not exist", () => {
		const manager = environment().get(RepoManager);

		expect(() => manager.deleteRepository("nope")).toThrow(RepositoryNotFoundError);
	});

	test("lists nothing before anything is created", () => {
		expect(environment().get(RepoManager).repositories()).toEqual([]);
	});
});

describe("the quantity kinds of a repository", () => {
	/**
	 * A repository whose database is migrated and whose vocabularies are loaded,
	 * with a product to hang channels on.
	 */
	function repository() {
		const container = environment();
		const manager = container.get(RepoManager);
		manager.createRepository("demo");

		const db = container.get(DatabaseManager).repoDb("demo");
		const metadata = { metadataCreatorId: "tester", metadataCreationTimestamp: new Date() };

		const manufacturer = db
			.insert(Manufacturer)
			.values({ slug: "bronkhorst", name: "Bronkhorst", ...metadata })
			.returning()
			.get();

		const product = db
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

		const addChannel = (quantityKindId: string | null) =>
			db
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

		return { manager, db, addChannel };
	}

	const kinds = (db: ReturnType<typeof repository>["db"]) =>
		db
			.select()
			.from(QuantityKind)
			.all()
			.map((kind) => kind.id)
			.sort();

	test("a new repository holds every kind the application lists", () => {
		const { db } = repository();

		expect(kinds(db)).toEqual(Object.keys(QUANTITY_KINDS).sort());
	});

	test("migrating again changes nothing", () => {
		const { manager, db } = repository();
		const before = kinds(db);

		manager.migrateAll();

		expect(kinds(db)).toEqual(before);
	});

	test("a kind the application no longer lists is removed", () => {
		const { manager, db } = repository();
		db.insert(QuantityKind).values({ id: "LuminousFlux" }).run();

		manager.migrateAll();

		expect(kinds(db)).not.toContain("LuminousFlux");
	});

	test("a channel cannot name a kind that is not there", () => {
		const { addChannel } = repository();

		expect(() => addChannel("SpaceVelocity")).toThrow();
	});

	test("a kind cannot be removed while a channel names it", () => {
		const { db, addChannel } = repository();
		addChannel("VolumeFlowRate");

		/*
			Dropping a kind from the list makes the sync issue this statement. The
			test therefore says what happens when a kind still in use leaves the
			list.
		*/
		expect(() =>
			db.delete(QuantityKind).where(eq(QuantityKind.id, "VolumeFlowRate")).run(),
		).toThrow();
	});

	test("a renamed kind carries its channels with it", () => {
		const { db, addChannel } = repository();
		const channel = addChannel("VolumeFlowRate");

		db.update(QuantityKind)
			.set({ id: "VolumetricFlowRate" })
			.where(eq(QuantityKind.id, "VolumeFlowRate"))
			.run();

		expect(db.select().from(Channel).where(eq(Channel.id, channel.id)).get()?.quantityKindId).toBe(
			"VolumetricFlowRate",
		);
	});
});
