import { describe, test, expect } from "vitest";

import { createTestDb, dateToInteger, integerToDate } from "../../../testUtils";
import { getUsagesAsProperty } from "../getUsagesAsProperty";

import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { IDeviceDefinitionId, IDeviceId, IUserId } from "~/lib/database/Ids";

const deviceNameById = new Map<IDeviceId, string>();

const createDevice = (
	uniqueName: string,
	deviceDefinitionId: IDeviceDefinitionId,
	userId: IUserId
) => {
	const doc = EntityFactory.create(
		"Device",
		{
			name: uniqueName,
			definitionId: deviceDefinitionId,
			imageResourceIds: [],
			specifications: [],
			setupDescription: [],
		},
		userId
	);

	deviceNameById.set(doc.id, uniqueName);

	return doc;
};

const sanitize = (docs: DrizzleEntity<"Property">[]) => {
	return docs
		.sort((a, b) => {
			return a.begin.getTime() - b.begin.getTime();
		})
		.map((d) => {
			return {
				...d,
				id: undefined,
				ownerDeviceId: deviceNameById.get(d.ownerDeviceId),
				deviceId: deviceNameById.get(d.deviceId as IDeviceId),
				begin: dateToInteger(d.begin),
				end: dateToInteger(d.end),
			};
		});
};

describe("getUsagesAsProperty", () => {
	describe("initial test", async () => {
		const { el, schema, user } = await createTestDb();
		const { Property } = schema;

		const userId = user.id;

		const deviceDefinition = EntityFactory.create(
			"DeviceDefinition",
			{
				name: "Test",
				parentDeviceDefinitionIds: [],
				imageResourceIds: [],
				acceptsUnit: [],
				specifications: [],
				couchId: null,
			},
			user.id
		);
		await el.insert(schema.DeviceDefinition, deviceDefinition);

		const root = createDevice("Root-Device", deviceDefinition.id, userId);
		const c1 = createDevice("Child1", deviceDefinition.id, userId);
		const c2 = createDevice("Child2", deviceDefinition.id, userId);
		const c3 = createDevice("Child3", deviceDefinition.id, userId);

		await el.insert(schema.Device, root);
		await el.insert(schema.Device, c1);
		await el.insert(schema.Device, c2);
		await el.insert(schema.Device, c3);

		await el.insert(
			schema.Property,
			EntityFactory.create(
				"Property",
				{
					ownerDeviceId: root.id,
					name: "device1",
					begin: integerToDate(0),
					end: integerToDate(3),
					deviceId: c1.id,
				},
				userId
			)
		);

		await el.insert(
			schema.Property,
			EntityFactory.create(
				"Property",
				{
					ownerDeviceId: root.id,
					name: "device1",
					begin: integerToDate(2),
					end: integerToDate(5),
					deviceId: c1.id,
				},
				userId
			)
		);

		await el.insert(
			schema.Property,
			EntityFactory.create(
				"Property",
				{
					ownerDeviceId: root.id,
					name: "device1",
					begin: integerToDate(5),
					end: integerToDate(10),
					deviceId: c1.id,
				},
				userId
			)
		);

		await el.insert(
			schema.Property,
			EntityFactory.create(
				"Property",
				{
					ownerDeviceId: root.id,
					name: "device2",
					begin: integerToDate(5),
					end: undefined,
					deviceId: c2.id,
				},
				userId
			)
		);

		test.each([
			{ id: c1.id, begin: 0, end: 3 },
			{ id: c1.id, begin: 2, end: 5 },
			{ id: c1.id, begin: 2, end: 10 },
			{ id: c2.id, begin: 2, end: 10 },
			{ id: c2.id, begin: 2, end: null },
			{ id: c1.id, begin: 5, end: 10 },
		])("includeOverlaps: %o", async ({ id, begin, end }) => {
			const args = (includeOverlaps: boolean) =>
				[
					el,
					Property,
					id,
					{
						begin: integerToDate(begin),
						end: typeof end === "number" ? integerToDate(end) : undefined,
					},
					includeOverlaps,
				] as const;

			expect(sanitize(await getUsagesAsProperty(...args(true)))).toMatchSnapshot();
			expect(sanitize(await getUsagesAsProperty(...args(false)))).toMatchSnapshot();
		});
	});
});
