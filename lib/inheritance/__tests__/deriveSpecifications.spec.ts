import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, test } from "vitest";

import { EntityFactory } from "../../database/EntityFactory";
import type { IUserId } from "../../database/Ids";
import type { IDeviceDefinitionTraversalResult } from "../deriveSpecifications";
import { deriveSpecifications } from "../deriveSpecifications";
import { collectRelatedDefinitions } from "../resolver/collectRelatedDefinitions";

import type { EntityLoader } from "~/apps/repo-server/src/services/EntityLoader";
import { closureTableSetParent } from "~/apps/repo-server/src/utils/closureTable/closureTableTree";
import { setSpecifications } from "~/apps/repo-server/src/utils/setSpecifications";
import { createTestDb } from "~/apps/repo-server/testUtils";
import type { DrizzleEntity, DrizzleSchema } from "~/drizzle/DrizzleSchema";

describe("Specifications inheritance", () => {
	let el: EntityLoader;
	let schema: DrizzleSchema;

	let userId: IUserId;

	let bronkhorstDevices: DrizzleEntity<"DeviceDefinition">;
	let mfcDevices: DrizzleEntity<"DeviceDefinition">;
	let mfc: DrizzleEntity<"Device">;

	const convertDerivedDefinitions = async (d: IDeviceDefinitionTraversalResult[]) => {
		return (
			await Promise.all(
				d.map((d) =>
					(async () => {
						return (
							await el.drizzle
								.select()
								.from(schema.DeviceDefinitionSpecification)
								.where(eq(schema.DeviceDefinitionSpecification.ownerId, d.definition))
						).map((s) => ({
							level: d.level,
							name: s.name,
							value: s.value,
						}));
					})()
				)
			)
		).flat();
	};

	beforeEach(async () => {
		const testDb = await createTestDb();
		el = testDb.el;
		schema = testDb.schema;

		userId = testDb.user.id;

		bronkhorstDevices = EntityFactory.create(
			"DeviceDefinition",
			{
				name: "Bronkhorst Devices",
				imageResourceIds: [],
				acceptsUnit: [],
			},
			userId
		);
		await el.insert(schema.DeviceDefinition, bronkhorstDevices);
		await setSpecifications(
			bronkhorstDevices.id,
			[{ name: "manufacture", value: "Bronkhorst" }],
			schema.DeviceDefinitionSpecification,
			el
		);

		// MFCs
		mfcDevices = EntityFactory.create(
			"DeviceDefinition",
			{
				name: "MFCs",
				imageResourceIds: [],
				acceptsUnit: [],
			},
			userId
		);
		await el.insert(schema.DeviceDefinition, mfcDevices);
		await closureTableSetParent(
			mfcDevices.id,
			bronkhorstDevices.id,
			el,
			schema.DeviceDefinitionPaths
		);
		await setSpecifications(
			mfcDevices.id,
			[{ name: "description", value: "Gas mass flow controllers for flow rates" }],
			schema.DeviceDefinitionSpecification,
			el
		);

		mfc = EntityFactory.create(
			"Device",
			{
				name: "Test-MFC",
				definitionId: mfcDevices.id,
				imageResourceIds: [],
				setupDescription: [],
			},
			userId
		);

		await el.insert(schema.Device, mfc);
		await setSpecifications(
			mfc.id,
			[{ name: "serialNo", value: "123-123" }],
			schema.DeviceSpecification,
			el
		);
	});

	test("Basic", async () => {
		expect(
			deriveSpecifications(
				await convertDerivedDefinitions(await collectRelatedDefinitions(mfc.id, { el, schema }))
			).map((s) => ({
				name: s.name,
				value: s.value,
			}))
		).toMatchSnapshot();
	});

	test("More-Specific values should be used", async () => {
		// Insert second description (both bronkhorstDevices and mfcDevices now have a description)
		// We want the mfcDevices description to win since it is more specific (closer to the device
		// in the tree)
		await el.drizzle
			.insert(schema.DeviceDefinitionSpecification)
			.values({ ownerId: bronkhorstDevices.id, name: "description", value: "Bronkhorst-Devices" });
		await el.update(schema.DeviceDefinition, bronkhorstDevices.id, bronkhorstDevices);

		expect(
			deriveSpecifications(
				await convertDerivedDefinitions(await collectRelatedDefinitions(mfc.id, { el, schema }))
			).map((s) => ({
				name: s.name,
				value: s.value,
			}))
		).toMatchSnapshot();
	});
});
