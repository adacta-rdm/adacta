import { asc, gt } from "drizzle-orm";
import type { PgliteDatabase } from "drizzle-orm/pglite/index";
import { beforeEach, describe, expect, test } from "vitest";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import {
	closureTableDeleteLeaf,
	closureTableDeleteSubtree,
	closureTableInsert,
	closureTableMoveSubtree,
	closureTableSetParent,
} from "~/apps/repo-server/src/utils/closureTable/closureTableTree";
import { createTestDb, testUUIDtoInteger } from "~/apps/repo-server/testUtils";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IDeviceDefinitionId, IUserId } from "~/lib/database/Ids";

describe("closureTable", () => {
	let drizzle: PgliteDatabase;
	let el: EntityLoader;
	let schema: DrizzleSchema;
	let userId: IUserId;

	const dumpRelations = async () => {
		return (
			(
				await el.drizzle
					.select()
					.from(schema.DeviceDefinitionPaths)
					// Filter out self-links as they only clutter the output
					.where((t) => gt(t.depth, 0))
					// Sort by ancestorId, descendantId to make the output deterministic and ensure
					// that the snapshot is readable
					.orderBy(
						asc(schema.DeviceDefinitionPaths.ancestorId),
						asc(schema.DeviceDefinitionPaths.descendantId)
					)
			).map((r) => {
				return {
					ancestor: testUUIDtoInteger(r.ancestorId),
					descendant: testUUIDtoInteger(r.descendantId),
					depth: r.depth,
				};
			})
		);
	};

	const selfLink = async (id: IDeviceDefinitionId) => {
		return drizzle.insert(schema.DeviceDefinitionPaths).values({
			ancestorId: id,
			descendantId: id,
			depth: 0,
		});
	};

	const createDD = async (name: string) => {
		const e = EntityFactory.create(
			"DeviceDefinition",
			{
				name,
				parentDeviceDefinitionIds: [],
				imageResourceIds: [],
				acceptsUnit: [],
				specifications: [],
			},
			userId
		);
		await drizzle.insert(schema.DeviceDefinition).values(e);
		return e;
	};

	beforeEach(async () => {
		const test = await createTestDb();
		userId = test.user.id;
		drizzle = test.drizzle;
		el = test.el;
		schema = test.schema;
	});

	test("Inserts into closure table", async () => {
		const { DeviceDefinitionPaths } = schema;

		const d0 = await createDD("d0");
		const d1 = await createDD("d1");
		const d2 = await createDD("d2");
		const d3 = await createDD("d3");
		const d4 = await createDD("d4");

		await selfLink(d0.id); // First root must be linked to itself manually (?)

		// 0 -> 1
		await closureTableInsert(el, DeviceDefinitionPaths, d0.id, d1.id);
		expect(await dumpRelations()).toMatchSnapshot();

		// 1 -> 2
		await closureTableInsert(el, DeviceDefinitionPaths, d1.id, d2.id);
		expect(await dumpRelations()).toMatchSnapshot();

		// 2 -> 3
		// 2 -> 4
		await closureTableInsert(el, DeviceDefinitionPaths, d2.id, d3.id);
		await closureTableInsert(el, DeviceDefinitionPaths, d2.id, d4.id);
		expect(await dumpRelations()).toMatchSnapshot();
	});

	test("Move subtree", async () => {
		const { DeviceDefinitionPaths } = schema;

		const d0 = await createDD("d0");
		const d1 = await createDD("d1");
		const d2 = await createDD("d2");
		const d3 = await createDD("d3");
		const d4 = await createDD("d4");
		const d5 = await createDD("d5");

		await selfLink(d0.id); // First root must be linked to itself manually (?)

		// 0 -> 1
		await closureTableInsert(el, DeviceDefinitionPaths, d0.id, d1.id);
		// 1 -> 2
		await closureTableInsert(el, DeviceDefinitionPaths, d1.id, d2.id);
		// 2 -> 3
		await closureTableInsert(el, DeviceDefinitionPaths, d2.id, d3.id);
		// 2 -> 4
		await closureTableInsert(el, DeviceDefinitionPaths, d2.id, d4.id);
		// 4 -> 5
		await closureTableInsert(el, DeviceDefinitionPaths, d4.id, d5.id);

		// Right now 4/5 are children of 2, but we want to move them to be children of 3
		await closureTableMoveSubtree(el, DeviceDefinitionPaths, d4.id, d3.id);

		expect(await dumpRelations()).toMatchSnapshot();
	});

	test("Delete Leaf", async () => {
		const { DeviceDefinitionPaths } = schema;

		const d0 = await createDD("d0");
		const d1 = await createDD("d1");
		const d2 = await createDD("d2");
		const d3 = await createDD("d3");

		await selfLink(d0.id); // First root must be linked to itself manually (?)

		// 0 -> 1
		await closureTableInsert(el, DeviceDefinitionPaths, d0.id, d1.id);
		// 1 -> 2
		await closureTableInsert(el, DeviceDefinitionPaths, d1.id, d2.id);
		// 2 -> 3
		await closureTableInsert(el, DeviceDefinitionPaths, d2.id, d3.id);

		await closureTableDeleteLeaf(el, DeviceDefinitionPaths, d3.id);

		expect(await dumpRelations()).toMatchSnapshot();
	});

	test("Delete subtree", async () => {
		const { DeviceDefinitionPaths } = schema;

		const d0 = await createDD("d0");
		const d1 = await createDD("d1");
		const d2 = await createDD("d2");
		const d3 = await createDD("d3");

		await selfLink(d0.id); // First root must be linked to itself manually (?)

		// 0 -> 1
		await closureTableInsert(el, DeviceDefinitionPaths, d0.id, d1.id);
		// 1 -> 2
		await closureTableInsert(el, DeviceDefinitionPaths, d1.id, d2.id);
		// 2 -> 3
		await closureTableInsert(el, DeviceDefinitionPaths, d2.id, d3.id);

		await closureTableDeleteSubtree(el, DeviceDefinitionPaths, d2.id);

		expect(await dumpRelations()).toMatchSnapshot();
	});

	test("Change parent", async () => {
		const { DeviceDefinitionPaths } = schema;

		const d0 = await createDD("d0");
		const d1 = await createDD("d1");
		const d2 = await createDD("d2");
		const d3 = await createDD("d3");
		const d4 = await createDD("d4");
		const d5 = await createDD("d5");

		const newRoot = await createDD("d6");

		// 0 -> 1
		await closureTableInsert(el, DeviceDefinitionPaths, d0.id, d1.id);
		// 1 -> 2
		await closureTableInsert(el, DeviceDefinitionPaths, d1.id, d2.id);
		// 2 -> 3
		await closureTableInsert(el, DeviceDefinitionPaths, d2.id, d3.id);
		// 3 -> 4
		await closureTableInsert(el, DeviceDefinitionPaths, d3.id, d4.id);
		// 4 -> 5
		await closureTableInsert(el, DeviceDefinitionPaths, d4.id, d5.id);

		// Change parent from existing node to new node
		await closureTableSetParent(d2.id, newRoot.id, el, schema.DeviceDefinitionPaths);
		expect(await dumpRelations()).toMatchSnapshot();

		// Change parent to undefined
		await closureTableSetParent(d3.id, undefined, el, schema.DeviceDefinitionPaths);
		expect(await dumpRelations()).toMatchSnapshot();

		// Change parent from undefined to different root
		const newRoot2 = await createDD("d7");
		await closureTableSetParent(d3.id, newRoot2.id, el, schema.DeviceDefinitionPaths);
		expect(await dumpRelations()).toMatchSnapshot();
	});
});
