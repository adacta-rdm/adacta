import type { PgliteDatabase } from "drizzle-orm/pglite";
import { beforeEach, describe, expect, test } from "vitest";

import { serverSideDeviceSpecificationsSQL } from "~/apps/repo-server/src/graphql/resolvers/utils/serverSideDeviceSpecificationsSQL";
import { serverSideSpecifications } from "~/apps/repo-server/src/graphql/resolvers/utils/serverSideSpecifications";
import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { closureTableSetParent } from "~/apps/repo-server/src/utils/closureTable/closureTableTree";
import { setSpecifications } from "~/apps/repo-server/src/utils/setSpecifications";
import { createTestDb } from "~/apps/repo-server/testUtils";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IUserId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

describe("Specifications inheritance", () => {
	let drizzle: PgliteDatabase;
	let el: EntityLoader;
	let schema: DrizzleSchema;
	let userId: IUserId;

	beforeEach(async () => {
		const test = await createTestDb();
		userId = test.user.id;
		drizzle = test.drizzle;
		el = test.el;
		schema = test.schema;
	});

	const createDD = async (name: string, specifications?: ISpecification[]) => {
		const e = EntityFactory.create(
			"DeviceDefinition",
			{
				name,
				parentDeviceDefinitionIds: [],
				imageResourceIds: [],
				acceptsUnit: [],
			},
			userId
		);
		await drizzle.insert(schema.DeviceDefinition).values(e);

		if (specifications) {
			await setSpecifications(e.id, specifications, schema.DeviceDefinitionSpecification, el);
		}

		return e;
	};

	test("Device inherits specifications", async () => {
		const { Device } = schema;
		const d0 = await createDD("d0", [
			{ name: "name", value: "0" },
			{ name: "dd0Property", value: "d0Value" },
		]);
		const d1 = await createDD("d1", [
			{ name: "name", value: "1" },
			{ name: "testProperty", value: "123" },
			{ name: "dd1Property", value: "dd1Value" },
		]);
		const d2 = await createDD("d2", [
			{ name: "name", value: "2" },
			{ name: "testProperty", value: "321" },
			{ name: "dd2Property", value: "dd2Property" },
		]);

		await closureTableSetParent(d1.id, d0.id, el, schema.DeviceDefinitionPaths);
		await closureTableSetParent(d2.id, d1.id, el, schema.DeviceDefinitionPaths);

		const device = EntityFactory.create(
			"Device",
			{
				name: "Test-Device",
				definitionId: d2.id,
				imageResourceIds: [],
				setupDescription: [],
			},
			userId
		);
		await el.insert(Device, device);
		await setSpecifications(
			device.id,
			[
				{ name: "name", value: "Test-Device" },
				{ name: "device", value: "true" },
			],
			schema.DeviceSpecification,
			el
		);

		const sqlSolution = await serverSideDeviceSpecificationsSQL(device.id, { el, schema });

		const jsSolution = await serverSideSpecifications(
			{
				type: "Device",
				id: device.id,
			},
			{ el, schema }
		);

		expect(jsSolution).toMatchInlineSnapshot(`
			[
			  {
			    "level": 3,
			    "name": "dd0Property",
			    "value": "d0Value",
			  },
			  {
			    "level": 2,
			    "name": "dd1Property",
			    "value": "dd1Value",
			  },
			  {
			    "level": 1,
			    "name": "dd2Property",
			    "value": "dd2Property",
			  },
			  {
			    "level": 1,
			    "name": "testProperty",
			    "value": "321",
			  },
			  {
			    "level": 0,
			    "name": "device",
			    "value": "true",
			  },
			  {
			    "level": 0,
			    "name": "name",
			    "value": "Test-Device",
			  },
			]
		`);

		expect(jsSolution).toEqual(sqlSolution);
	});
});
