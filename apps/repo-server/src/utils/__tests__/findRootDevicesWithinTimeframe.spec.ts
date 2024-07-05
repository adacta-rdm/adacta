import { describe, test, expect } from "vitest";

import { createTestDb, integerToDate, TestDeviceCreator } from "../../../testUtils";
import { findRootDevicesWithinTimeframe } from "../findRootDevicesWithinTimeframe";

import { EntityFactory } from "~/lib/database/EntityFactory";

describe("Link reactor to samples", () => {
	const sortIds = (ids: string[]) => ids.sort((a, b) => a.localeCompare(b));

	async function setup() {
		const { user, sc, el, schema } = await createTestDb();
		const ef = sc.get(EntityFactory);

		// Device which has a sub device
		const deviceDefinition = ef.create("DeviceDefinition", {
			name: "Device with Sub-Devices",
			specifications: [],
			imageResourceIds: [],
			acceptsUnit: [],
			parentDeviceDefinitionIds: [],
		});

		const deviceDefinitionWithSample = ef.create("DeviceDefinition", {
			name: "Device with Sample",
			specifications: [],
			imageResourceIds: [],
			acceptsUnit: [],
			parentDeviceDefinitionIds: [],
		});

		await el.insert(schema.DeviceDefinition, deviceDefinition);
		await el.insert(schema.DeviceDefinition, deviceDefinitionWithSample);

		return { el, ef, user, schema, deviceDefinition, deviceDefinitionWithSample };
	}

	describe("findRootDevices", () => {
		/*
        Note how in the following example there is never a real connection from Z to A

        digraph {
            Z -> X [label="5-10" ];
            X -> A [label="1-5"];
            Y -> A [label="5-10"];
        }

        ┌───────┐
        │   Y   │
        └───────┘
          │
          │ 5-10
          ▼
        ┌───────┐
        │   A   │ ◀┐
        └───────┘  │
        ┌───────┐  │
        │   Z   │  │
        └───────┘  │
          │        │ 1-5
          │ 5-10   │
          ▼        │
        ┌───────┐  │
        │   X   │ ─┘
        └───────┘
         */
		test("Simple example with narrowing", async () => {
			const {
				el,
				user,
				deviceDefinition,
				schema: { Device, Property },
			} = await setup();

			const deviceCreator = new TestDeviceCreator(user.id);
			deviceCreator.addDevice(deviceDefinition, "A");
			const [a, ...aProps] = deviceCreator.getEntities();

			deviceCreator.addDevice(deviceDefinition, "X");
			deviceCreator.addProperty("slot-in-X", a.id, integerToDate(1), integerToDate(5));
			const [x, ...xProps] = deviceCreator.getEntities();

			deviceCreator.addDevice(deviceDefinition, "Y");
			deviceCreator.addProperty("slot-in-Y", a.id, integerToDate(5), integerToDate(10));
			const [y, ...yProps] = deviceCreator.getEntities();

			deviceCreator.addDevice(deviceDefinition, "Z");
			deviceCreator.addProperty("slot-in-Z", x.id, integerToDate(5), integerToDate(10));
			const [z, ...zProps] = deviceCreator.getEntities();

			for (const device of [a, x, y, z]) {
				await el.insert(Device, device);
			}

			for (const property of [...aProps, ...xProps, ...yProps, ...zProps]) {
				await el.insert(Property, property);
			}

			const narrowedDown = await findRootDevicesWithinTimeframe(
				a.id,
				el,
				Property,
				integerToDate(1),
				integerToDate(10)
			);

			// console.log(narrowedDown, [x.id, y.id]);
			expect(sortIds(narrowedDown)).toEqual(sortIds([x.id, y.id]));
		});

		/*
        digraph {
                Z -> X [label="4-10" ];
                X -> A [label="1-5"];
                Y -> A [label="5-10"];
        }

        ┌───────┐
        │   Y   │
        └───────┘
          │
          │ 5-10
          ▼
        ┌───────┐
        │   A   │ ◀┐
        └───────┘  │
        ┌───────┐  │
        │   Z   │  │
        └───────┘  │
          │        │ 1-5
          │ 4-10   │
          ▼        │
        ┌───────┐  │
        │   X   │ ─┘
        └───────┘

        */
		test("Example where narrowing isn't important", async () => {
			const {
				el,
				user,
				deviceDefinition,
				schema: { Device, Property },
			} = await setup();

			const deviceCreator = new TestDeviceCreator(user.id);
			deviceCreator.addDevice(deviceDefinition, "A");
			const [a, ...aProps] = deviceCreator.getEntities();

			deviceCreator.addDevice(deviceDefinition, "X");
			deviceCreator.addProperty("slot", a.id, integerToDate(1), integerToDate(5));
			const [x, ...xProps] = deviceCreator.getEntities();

			deviceCreator.addDevice(deviceDefinition, "Y");
			deviceCreator.addProperty("slot", a.id, integerToDate(5), integerToDate(10));
			const [y, ...yProps] = deviceCreator.getEntities();

			deviceCreator.addDevice(deviceDefinition, "Z");
			deviceCreator.addProperty("slot", x.id, integerToDate(4), integerToDate(10));
			const [z, ...zProps] = deviceCreator.getEntities();

			for (const device of [a, x, y, z]) {
				await el.insert(Device, device);
			}

			for (const property of [...aProps, ...xProps, ...yProps, ...zProps]) {
				await el.insert(Property, property);
			}

			const narrowedDown = await findRootDevicesWithinTimeframe(
				a.id,
				el,
				Property,
				integerToDate(1),
				integerToDate(10)
			);

			expect(sortIds(narrowedDown)).toEqual(sortIds([z.id, y.id]));
		});

		test("returns empty array when called with unused sample", async () => {
			const {
				el,
				ef,
				schema: { Sample, Property },
			} = await setup();

			const sample = ef.create("Sample", { name: "sample1", specifications: [] });
			await el.insert(Sample, sample);

			const roots = await findRootDevicesWithinTimeframe(sample.id, el, Property);

			expect(roots).toEqual([]);
		});
	});
});
