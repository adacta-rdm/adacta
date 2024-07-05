import type { PgliteDatabase } from "drizzle-orm/pglite";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
	createTestDb,
	dateToInteger,
	integerToDate,
	TestDeviceCreator,
} from "../../../../testUtils";
import type { EntityLoader } from "../../../services/EntityLoader";
import { propertyPathToString } from "../../../utils/propertyPathToString";
import type { ISampleUsageInfo, ITimeframe } from "../collectSamples";
import {
	collectDevices,
	collectPropertiesWithPathOfDevice,
	collectSamples,
} from "../collectSamples";
import { deviceIdByPropertyPath } from "../deviceIdByPropertyPath";

import type { DrizzleEntity, DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { EntityFactory } from "~/lib/database/EntityFactory";
import type { ISampleId, IUserId } from "~/lib/database/Ids";
import { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";

describe("Link reactor to samples", () => {
	let drizzle: PgliteDatabase;
	let el: EntityLoader;
	let schema: DrizzleSchema;

	let userId: IUserId;
	let deviceDefinition: DrizzleEntity<"DeviceDefinition">;
	let deviceDefinitionWithSample: DrizzleEntity<"DeviceDefinition">;
	let createSample: (name: string) => Promise<DrizzleEntity<"Sample">>;

	beforeEach(async () => {
		const test = await createTestDb();
		userId = test.user.id;
		drizzle = test.drizzle;
		el = test.el;
		schema = test.schema;

		// Device which has a sub device
		deviceDefinition = EntityFactory.create(
			"DeviceDefinition",
			{
				couchId: null,
				parentDeviceDefinitionIds: [],
				name: "Device with Sub-Devices",
				specifications: [],
				imageResourceIds: [],
				acceptsUnit: [],
			},
			userId
		);

		deviceDefinitionWithSample = EntityFactory.create(
			"DeviceDefinition",
			{
				couchId: null,
				parentDeviceDefinitionIds: [],
				name: "Device with Sample",
				specifications: [],
				imageResourceIds: [],
				acceptsUnit: [],
			},
			userId
		);

		await drizzle
			.insert(schema.DeviceDefinition)
			.values([deviceDefinition, deviceDefinitionWithSample]);
		//
		createSample = async (name: string) => {
			const sample = EntityFactory.create(
				"Sample",
				{
					couchId: null,
					name: name,
					specifications: [],
				},
				userId
			);

			await drizzle.insert(schema.Sample).values(sample);

			return sample;
		};
	});

	afterEach(() => {
		// await rmp.closeAll();
		ServiceContainer.reset();
	});

	describe("collectSamples()", () => {
		test("finds a sample with direct connection (without time constraint)", async () => {
			const sample = await createSample("Test-Sample");

			const subdeviceCreator = new TestDeviceCreator(userId);
			subdeviceCreator.addDevice(deviceDefinitionWithSample, "Sub-Test");
			subdeviceCreator.addProperty("sample", sample.id, integerToDate(1), undefined);
			const [subdevice, ...subDeviceProperties] = subdeviceCreator.getEntities();
			await drizzle.insert(schema.Device).values(subdevice);
			await drizzle.insert(schema.Property).values(subDeviceProperties);

			const deviceCreator = new TestDeviceCreator(userId);
			deviceCreator.addDevice(deviceDefinitionWithSample, "Test");
			deviceCreator.addProperty("slot", subdevice.id, integerToDate(1), undefined);
			const [device, ...deviceProperties] = deviceCreator.getEntities();
			await drizzle.insert(schema.Device).values(device);
			await drizzle.insert(schema.Property).values(deviceProperties);

			const result = sortUsages(await collectSamples(device.id, el, schema));

			expect(result).toEqual([
				{
					sample: { id: sample.id },
					timeframes: [{ begin: integerToDate(1), pathFromTopLevelDevice: ["slot", "sample"] }],
				},
			]);
		});

		test("finds a sample with direct connection (with time constraint)", async () => {
			// Sample 1 + Sample 2 are actually used in `device`
			// Sample 3 is only used while `d1` isn't part of subdevice and therefore isn't a sample of `device`
			const sample = await createSample("Test-Sample");
			const sample2 = await createSample("Test-Sample 2");
			const sample3 = await createSample("Test-Sample 3");

			const d1Creator = new TestDeviceCreator(userId);
			d1Creator.addDevice(deviceDefinitionWithSample, "Test 1");
			d1Creator.addProperty("sample", sample.id, integerToDate(1), integerToDate(3));
			d1Creator.addProperty("sample", sample3.id, integerToDate(3), undefined);
			const [d1, ...d1Properties] = d1Creator.getEntities();
			await drizzle.insert(schema.Device).values(d1);
			await drizzle.insert(schema.Property).values(d1Properties);

			const d2Creator = new TestDeviceCreator(userId);
			d2Creator.addDevice(deviceDefinitionWithSample, "Test 2");
			d2Creator.addProperty("sample", sample2.id, integerToDate(1), undefined);
			const [d2, ...d2Properties] = d2Creator.getEntities();
			await drizzle.insert(schema.Device).values(d2);
			await drizzle.insert(schema.Property).values(d2Properties);

			const subdeviceCreator = new TestDeviceCreator(userId);
			subdeviceCreator.addDevice(deviceDefinition, "Sub-Device");
			subdeviceCreator.addProperty("slot", d1.id, integerToDate(1), integerToDate(2));
			subdeviceCreator.addProperty("slot", d2.id, integerToDate(2), integerToDate(3));
			const [subdevice, ...subdeviceProperties] = subdeviceCreator.getEntities();
			await drizzle.insert(schema.Device).values(subdevice);
			await drizzle.insert(schema.Property).values(subdeviceProperties);

			const deviceCreator = new TestDeviceCreator(userId);
			deviceCreator.addDevice(deviceDefinition, "Reaktor");
			deviceCreator.addProperty("slotInRoot", subdevice.id, integerToDate(1), undefined);
			const [device, ...deviceProperties] = deviceCreator.getEntities();
			await drizzle.insert(schema.Device).values(device);
			await drizzle.insert(schema.Property).values(deviceProperties);

			const result = sortUsages(await collectSamples(device.id, el, schema));
			expect(result).toEqual([
				{
					sample: { id: sample.id },
					timeframes: [
						{
							begin: integerToDate(1),
							end: integerToDate(2),
							pathFromTopLevelDevice: ["slotInRoot", "slot", "sample"],
						},
					],
				},
				{
					sample: { id: sample2.id },
					timeframes: [
						{
							begin: integerToDate(2),
							end: integerToDate(3),
							pathFromTopLevelDevice: ["slotInRoot", "slot", "sample"],
						},
					],
				},
			]);
		});

		test("finds only samples with meaningful timeframe (regression)", async () => {
			// Regression Test for bug where sample2 was listed as sample used by d1 with a
			// meaningless timeframe from 3 - 3 in the following setup:
			// - d2			is in	d1 	from	1 - 3
			// - sample2 	is in 	d2	from	3 - now
			const sample = await createSample("Test-Sample 1");
			const sample2 = await createSample("Test-Sample 2");

			const d2Creator = new TestDeviceCreator(userId);
			d2Creator.addDevice(deviceDefinitionWithSample, "Device 2");
			d2Creator.addProperty("sample", sample.id, integerToDate(1), integerToDate(3));
			d2Creator.addProperty("sample", sample2.id, integerToDate(3), undefined);
			const [d2, ...d2Properties] = d2Creator.getEntities();
			await drizzle.insert(schema.Device).values(d2);
			await drizzle.insert(schema.Property).values(d2Properties);

			const d1Creator = new TestDeviceCreator(userId);
			d1Creator.addDevice(deviceDefinition, "Device 1");
			d1Creator.addProperty("slot", d2.id, integerToDate(1), integerToDate(3));
			const [d1, ...d1Properties] = d1Creator.getEntities();
			await drizzle.insert(schema.Device).values(d1);
			await drizzle.insert(schema.Property).values(d1Properties);

			const result = sortUsages(await collectSamples(d1.id, el, schema));

			expect(result).toEqual([
				{
					sample: { id: sample.id },
					timeframes: [
						{
							begin: integerToDate(1),
							end: integerToDate(3),
							pathFromTopLevelDevice: ["slot", "sample"],
						},
					],
				},
			]);
		});

		test("narrows down usage time", async () => {
			// Sample is never removed from subdevice but subdevice gets removed from device
			// This means the usage of sample should end when subdevice gets removed from device
			const sample = await createSample("Test-Sample");

			const subdeviceCreator = new TestDeviceCreator(userId);
			subdeviceCreator.addDevice(deviceDefinitionWithSample, "Sub-Test");
			subdeviceCreator.addProperty("sample", sample.id, integerToDate(1), undefined);
			const [subdevice, ...subdeviceProperties] = subdeviceCreator.getEntities();
			await drizzle.insert(schema.Device).values(subdevice);
			await drizzle.insert(schema.Property).values(subdeviceProperties);

			const deviceCreator = new TestDeviceCreator(userId);
			deviceCreator.addDevice(deviceDefinition, "Sub-Test");
			deviceCreator.addProperty("slot", subdevice.id, integerToDate(1), integerToDate(5));
			const [device, ...deviceProperties] = deviceCreator.getEntities();
			await drizzle.insert(schema.Device).values(device);
			await drizzle.insert(schema.Property).values(deviceProperties);

			const result = sortUsages(await collectSamples(device.id, el, schema));

			expect(result).toEqual([
				{
					sample: { id: sample.id },
					timeframes: [
						{
							begin: integerToDate(1),
							end: integerToDate(5),
							pathFromTopLevelDevice: ["slot", "sample"],
						},
					],
				},
			]);
		});

		test("finds correct samples and narrows down usage", async () => {
			const s1 = await createSample("Sample 1");
			const s2 = await createSample("Sample 2");
			const s3 = await createSample("Sample 3");

			const d2Creator = new TestDeviceCreator(userId);
			d2Creator.addDevice(deviceDefinitionWithSample, "2");
			d2Creator.addProperty("sample", s1.id, integerToDate(1), integerToDate(20));
			d2Creator.addProperty("sample", s2.id, integerToDate(20), integerToDate(40));
			d2Creator.addProperty("sample", s3.id, integerToDate(40), integerToDate(60));
			const [d2, ...d2Properties] = d2Creator.getEntities();
			await drizzle.insert(schema.Device).values(d2);
			await drizzle.insert(schema.Property).values(d2Properties);

			const d1Creator = new TestDeviceCreator(userId);
			d1Creator.addDevice(deviceDefinition, "1");
			d1Creator.addProperty("slot", d2.id, integerToDate(25), integerToDate(50));
			const [d1, ...d1Properties] = d1Creator.getEntities();
			await drizzle.insert(schema.Device).values(d1);
			await drizzle.insert(schema.Property).values(d1Properties);

			expect(await dumpSamplesForAllDevices(el, schema)).toMatchSnapshot();
		});

		test("finds correct samples with multiple parents", async () => {
			const s1 = await createSample("Sample 1");

			const d3Creator = new TestDeviceCreator(userId);
			d3Creator.addDevice(deviceDefinitionWithSample, "3");
			d3Creator.addProperty("sample", s1.id, integerToDate(20), integerToDate(30));
			const [d3, ...d3Properties] = d3Creator.getEntities();
			await drizzle.insert(schema.Device).values(d3);
			await drizzle.insert(schema.Property).values(d3Properties);

			const d1Creator = new TestDeviceCreator(userId);
			d1Creator.addDevice(deviceDefinition, "1");
			d1Creator.addProperty("slot", d3.id, integerToDate(1), integerToDate(25));
			const [d1, ...d1Properties] = d1Creator.getEntities();
			await drizzle.insert(schema.Device).values(d1);
			await drizzle.insert(schema.Property).values(d1Properties);

			const d2Creator = new TestDeviceCreator(userId);
			d2Creator.addDevice(deviceDefinition, "2");
			d2Creator.addProperty("slot", d3.id, integerToDate(25), integerToDate(50));
			const [d2, ...d2Properties] = d2Creator.getEntities();
			await drizzle.insert(schema.Device).values(d2);
			await drizzle.insert(schema.Property).values(d2Properties);

			expect(await dumpSamplesForAllDevices(el, schema)).toMatchSnapshot();
		});
	});

	describe("collectSamples() + collectDevices()", () => {
		test("finds indirect connections to samples/devices", async () => {
			// digraph {
			//     "Reactor" -> "Furnace 1" [ label = "15-now" ];
			//     "Reactor" -> "FTIR 1" [ label = "15-now" ];
			//     "Reactor" -> "Thermocouple 1" [ label = "30-40" ];
			//     "Furnace 1" -> "Tube 1" [ label = "1-20" ];
			//     "Furnace 1" -> "Thermocouple 2" [ label = "3-4" ];
			//     "Furnace 1" -> "Thermocouple 3" [ label = "15-now" ];
			//     "Furnace 2" -> "Tube 1" [ label = "50-now" ];
			//     "Tube 1" -> "Sample 1" [ label = "1-now" ];
			// }
			//
			//                           ┌────────────────┐
			//                           │   Furnace 2    │
			//                           └────────────────┘
			//                             │
			//                             │ 50-now
			//                             ▼
			//                           ┌────────────────┐
			//                           │     Tube 1     │ ◀┐
			//                           └────────────────┘  │
			//                             │                 │
			//                             │ 1-now           │
			//                             ▼                 │
			//                           ┌────────────────┐  │
			//                           │    Sample 1    │  │
			//                           └────────────────┘  │
			//                                               │
			//   ┌─────────────────────────┐                 │ 1-20
			//   │                         │                 │
			//   │  ┌────────┐  15-now   ┌────────────────┐  │
			//   │  │ FTIR 1 │ ◀──────── │    Reactor     │  │
			//   │  └────────┘           └────────────────┘  │
			//   │                         │                 │
			//   │                         │ 15-now          │
			//   │                         ▼                 │
			//   │                       ┌────────────────┐  │      ┌────────────────┐
			//   │    ┌───────────────── │   Furnace 1    │ ─┘      │ Thermocouple 3 │
			//   │    │                  └────────────────┘         └────────────────┘
			//   │    │                    │                          ▲
			//   │    │                    └─────────────────┐        │ 15-now
			//   │    │                                      │        │
			//   │    │        30-40     ┌────────────────┐  │        │
			//   └────┼────────────────▶ │ Thermocouple 1 │  │ 3-4    │
			//        │                  └────────────────┘  │        │
			//        │                  ┌────────────────┐  │        │
			//        │                  │ Thermocouple 2 │ ◀┘        │
			//        │                  └────────────────┘           │
			//        │                                               │
			//        └───────────────────────────────────────────────┘
			const sample = await createSample("Test-Sample");

			// Custom device definitions

			// Device which has a sample
			const reactorDefinition = EntityFactory.create(
				"DeviceDefinition",
				{
					couchId: null,
					parentDeviceDefinitionIds: [],
					name: "Reactor",
					specifications: [],
					imageResourceIds: [],
					acceptsUnit: [],
				},
				userId
			);
			await drizzle.insert(schema.DeviceDefinition).values(reactorDefinition);

			const furnaceDefinition = EntityFactory.create(
				"DeviceDefinition",
				{
					couchId: null,
					parentDeviceDefinitionIds: [],
					name: "Furnace",
					specifications: [],
					imageResourceIds: [],
					acceptsUnit: [],
				},
				userId
			);
			await drizzle.insert(schema.DeviceDefinition).values(furnaceDefinition);

			// Tube
			const tube1Creator = new TestDeviceCreator(userId);
			tube1Creator.addDevice(deviceDefinitionWithSample, "Tube 1");
			tube1Creator.addProperty("sample", sample.id, integerToDate(1), undefined);
			const [tube1, ...tube1Properties] = tube1Creator.getEntities();
			await drizzle.insert(schema.Device).values(tube1);
			await drizzle.insert(schema.Property).values(tube1Properties);

			const ftirCreator = new TestDeviceCreator(userId);
			ftirCreator.addDevice(deviceDefinition, "FTIR 1");
			const [ftir] = ftirCreator.getEntities();
			await drizzle.insert(schema.Device).values(ftir);

			const thermocouple1Creator = new TestDeviceCreator(userId);
			thermocouple1Creator.addDevice(deviceDefinition, "Thermocouple 1");
			const [thermocouple1] = thermocouple1Creator.getEntities();
			await drizzle.insert(schema.Device).values(thermocouple1);

			const thermocouple2Creator = new TestDeviceCreator(userId);
			thermocouple2Creator.addDevice(deviceDefinition, "Thermocouple 2");
			const [thermocouple2] = thermocouple2Creator.getEntities();
			await drizzle.insert(schema.Device).values(thermocouple2);

			const thermocouple3Creator = new TestDeviceCreator(userId);
			thermocouple3Creator.addDevice(deviceDefinition, "Thermocouple 3");
			const [thermocouple3] = thermocouple3Creator.getEntities();
			await drizzle.insert(schema.Device).values(thermocouple3);

			// Furnace
			const furnace1Creator = new TestDeviceCreator(userId);
			furnace1Creator.addDevice(
				furnaceDefinition as DrizzleEntity<"DeviceDefinition">,
				"Furnace 1"
			);
			furnace1Creator.addProperty(
				"thermocouple",
				thermocouple2.id,
				integerToDate(3),
				integerToDate(4)
			);
			furnace1Creator.addProperty("thermocouple", thermocouple3.id, integerToDate(15), undefined);
			furnace1Creator.addProperty("tube", tube1.id, integerToDate(1), integerToDate(20));
			const [furnace1, ...furnace1Properties] = furnace1Creator.getEntities();
			await drizzle.insert(schema.Device).values(furnace1);
			await drizzle.insert(schema.Property).values(furnace1Properties);

			const furnace2Creator = new TestDeviceCreator(userId);
			furnace2Creator.addDevice(
				furnaceDefinition as DrizzleEntity<"DeviceDefinition">,
				"Furnace 2"
			);
			furnace2Creator.addProperty("tube", tube1.id, integerToDate(50), undefined);
			const [furnace2, ...furnace2Properties] = furnace2Creator.getEntities();
			await drizzle.insert(schema.Device).values(furnace2);
			await drizzle.insert(schema.Property).values(furnace2Properties);

			// Reaktor
			const reactorCreator = new TestDeviceCreator(userId);
			reactorCreator.addDevice(furnaceDefinition as DrizzleEntity<"DeviceDefinition">, "Reaktor");

			reactorCreator.addProperty("furnace", furnace1.id, integerToDate(15), undefined);
			reactorCreator.addProperty("ftir", ftir.id, integerToDate(1), undefined);
			reactorCreator.addProperty(
				"inletThermocouple",
				thermocouple1.id,
				integerToDate(30),
				integerToDate(40)
			);
			const [reactor, ...reactorProperties] = reactorCreator.getEntities();
			await drizzle.insert(schema.Device).values(reactor);
			await drizzle.insert(schema.Property).values(reactorProperties);

			expect(await dumpSamplesForAllDevices(el, schema)).toMatchSnapshot();
			expect(await dumpDevicesForAllSamples(el, schema)).toMatchSnapshot();
		});

		test("finds indirect connections to multiple samples", async () => {
			// digraph {
			//     "Device 1" -> "Device 2" [ label = "1-5" ];
			//     "Device 1" -> "Device 5" [ label = "6-10" ];
			//     "Device 2" -> "Device 3" [ label = "6-10" ];
			//     "Device 2" -> "Device 4" [ label = "2-7" ];
			//     "Device 3" -> "Sample 1" [ label = "2-10" ];
			//     "Device 4" -> "Sample 2" [ label = "1-9" ];
			//     "Device 5" -> "Sample 3" [ label = "1-now" ];
			// }
			//
			// ┌──────────┐  6-10   ┌──────────┐
			// │ Device 5 │ ◀────── │ Device 1 │
			// └──────────┘         └──────────┘
			//   │                    │
			//   │ 1-now              │ 1-5
			//   ▼                    ▼
			// ┌──────────┐         ┌──────────┐  2-7   ┌──────────┐
			// │ Sample 3 │         │ Device 2 │ ─────▶ │ Device 4 │
			// └──────────┘         └──────────┘        └──────────┘
			//                        │                   │
			//                        │ 6-10              │ 1-9
			//                        ▼                   ▼
			//                      ┌──────────┐        ┌──────────┐
			//                      │ Device 3 │        │ Sample 2 │
			//                      └──────────┘        └──────────┘
			//                        │
			//                        │ 2-10
			//                        ▼
			//                      ┌──────────┐
			//                      │ Sample 1 │
			//                      └──────────┘
			//
			//
			const s1 = await createSample("Sample 1");
			const s2 = await createSample("Sample 2");
			const s3 = await createSample("Sample 3");

			const d3Creator = new TestDeviceCreator(userId);
			d3Creator.addDevice(deviceDefinitionWithSample, "3");
			d3Creator.addProperty("sample", s1.id, integerToDate(2), integerToDate(10));
			const [d3, ...d3Properties] = d3Creator.getEntities();
			await drizzle.insert(schema.Device).values(d3);
			await drizzle.insert(schema.Property).values(d3Properties);

			const d4Creator = new TestDeviceCreator(userId);
			d4Creator.addDevice(deviceDefinitionWithSample, "4");
			d4Creator.addProperty("sample", s2.id, integerToDate(1), integerToDate(9));
			const [d4, ...d4Properties] = d4Creator.getEntities();
			await drizzle.insert(schema.Device).values(d4);
			await drizzle.insert(schema.Property).values(d4Properties);

			const d5Creator = new TestDeviceCreator(userId);
			d5Creator.addDevice(deviceDefinitionWithSample, "5");
			d5Creator.addProperty("sample", s3.id, integerToDate(1), undefined);
			const [d5, ...d5Properties] = d5Creator.getEntities();
			await drizzle.insert(schema.Device).values(d5);
			await drizzle.insert(schema.Property).values(d5Properties);

			const d2Creator = new TestDeviceCreator(userId);
			d2Creator.addDevice(deviceDefinition, "2");
			d2Creator.addProperty("slot", d3.id, integerToDate(6), integerToDate(10));
			d2Creator.addProperty("slot2", d4.id, integerToDate(2), integerToDate(7));
			const [d2, ...d2Properties] = d2Creator.getEntities();
			await drizzle.insert(schema.Device).values(d2);
			await drizzle.insert(schema.Property).values(d2Properties);

			const d1Creator = new TestDeviceCreator(userId);
			d1Creator.addDevice(deviceDefinition, "1");
			d1Creator.addProperty("slot", d2.id, integerToDate(1), integerToDate(5));
			d1Creator.addProperty("slot2", d5.id, integerToDate(6), integerToDate(10));
			const [d1, ...d1Properties] = d1Creator.getEntities();
			await drizzle.insert(schema.Device).values(d1);
			await drizzle.insert(schema.Property).values(d1Properties);

			expect(await dumpSamplesForAllDevices(el, schema)).toMatchSnapshot();
			expect(await dumpDevicesForAllSamples(el, schema)).toMatchSnapshot();
		});
	});
	describe("group", () => {
		let device1: DrizzleEntity<"Device">;
		let device2: DrizzleEntity<"Device">;
		let device3: DrizzleEntity<"Device">;
		let device4: DrizzleEntity<"Device">;
		beforeEach(async () => {
			// digraph {
			//  "Device 2" -> "Device 3" [ label = "6-10" ];
			//  "Device 2" -> "Device 4" [ label = "2-7" ];
			//  "Device 1" -> "Device 2" [ label = "1-5" ];
			// }
			//
			//                     ┌──────────┐
			//                     │ Device 1 │
			//                     └──────────┘
			//                       │
			//                       │ 1-5
			//                       ▼
			// ┌──────────┐  2-7   ┌──────────┐
			// │ Device 4 │ ◀───── │ Device 2 │
			// └──────────┘        └──────────┘
			//                       │
			//                       │ 3-10
			//                       ▼
			//                     ┌──────────┐
			//                     │ Device 3 │
			//                     └──────────┘
			//
			//

			const d3Creator = new TestDeviceCreator(userId);
			d3Creator.addDevice(deviceDefinition, "3");
			const [d3] = d3Creator.getEntities();
			await drizzle.insert(schema.Device).values(d3);
			device3 = d3;

			const d4Creator = new TestDeviceCreator(userId);
			d4Creator.addDevice(deviceDefinition, "4");
			const [d4] = d4Creator.getEntities();
			await drizzle.insert(schema.Device).values(d4);
			device4 = d4;

			const d2Creator = new TestDeviceCreator(userId);
			d2Creator.addDevice(deviceDefinition, "2");
			d2Creator.addProperty("slot of d2 for d3", d3.id, integerToDate(3), integerToDate(10));
			d2Creator.addProperty("slot of d2 for d4", d4.id, integerToDate(2), integerToDate(7));
			const [d2, ...d2Properties] = d2Creator.getEntities();
			await drizzle.insert(schema.Device).values(d2);
			await drizzle.insert(schema.Property).values(d2Properties);
			device2 = d2;

			const d1Creator = new TestDeviceCreator(userId);
			d1Creator.addDevice(deviceDefinition, "1");
			d1Creator.addProperty("slot of d1 for d2", d2.id, integerToDate(1), integerToDate(5));
			const [d1, ...d1Properties] = d1Creator.getEntities();
			await drizzle.insert(schema.Device).values(d1);
			await drizzle.insert(schema.Property).values(d1Properties);
			device1 = d1;
		});

		test("deviceIdByPath", async () => {
			expect(
				await deviceIdByPropertyPath(
					el,
					schema,
					device1.id,
					["slot of d1 for d2", "slot of d2 for d4"],
					integerToDate(2),
					integerToDate(5)
				)
			).toEqual(device4.id);
			expect(
				await deviceIdByPropertyPath(
					el,
					schema,
					device1.id,
					["slot of d1 for d2", "slot of d2 for d3"],
					integerToDate(3),
					integerToDate(4)
				)
			).toEqual(device3.id);
			await expect(
				deviceIdByPropertyPath(
					el,
					schema,
					device1.id,
					["slot of d1 for d2", "slot of d2 for d3"],
					integerToDate(1),
					integerToDate(4)
				)
			).rejects.toThrow(
				`No device at "${propertyPathToString([
					"slot of d1 for d2",
					"slot of d2 for d3",
				])}" in range: ${integerToDate(1).toISOString()} - ${integerToDate(4).toISOString()}`
			);
		});

		test("collectPropertiesWithPathOfDevice()", async () => {
			const properties = await collectPropertiesWithPathOfDevice(device1.id, el, schema);
			expect(properties.find((d) => d.component.id === device2.id)?.pathFromTopLevelDevice).toEqual(
				["slot of d1 for d2"]
			);
			expect(properties.find((d) => d.component.id === device3.id)?.pathFromTopLevelDevice).toEqual(
				["slot of d1 for d2", "slot of d2 for d3"]
			);
			expect(properties.find((d) => d.component.id === device4.id)?.pathFromTopLevelDevice).toEqual(
				["slot of d1 for d2", "slot of d2 for d4"]
			);
		});

		test("collectSamples", async () => {
			const sampleUsages: ISampleUsageInfo[] = [
				{
					id: "foo" as ISampleId,
					pathFromTopLevelDevice: ["sample1"],
					begin: integerToDate(1),
					end: integerToDate(5),
				},
				{
					id: "foo" as ISampleId,
					pathFromTopLevelDevice: ["sample1"],
					begin: integerToDate(7),
					end: integerToDate(8),
				},
				{
					id: "foo" as ISampleId,
					pathFromTopLevelDevice: ["sample2"],
					begin: integerToDate(10),
					end: integerToDate(15),
				},
			];

			expect(
				(
					await collectSamples(device1.id, el, schema, () => Promise.resolve([sampleUsages, []]))
				).map((v) => ({
					...v,
					timeframes: v.timeframes.map((t) => [dateToInteger(t.begin), dateToInteger(t.end)]),
				}))
			).toMatchSnapshot();
		});
	});
});

/**
 * Helper method which collects all samples (using `goUpwardsAndCollectSamples`) and groups them by sample (using `groupUsagesBySample`)
 * To make output deterministic for snapshots and readable for humans the sample ids get replaced by the sample names.
 * To improve human readability the dates get mapped back to integers (using `dateToInteger`)
 */
async function dumpSamplesForAllDevices(el: EntityLoader, schema: DrizzleSchema) {
	const allSamples = await el.find(schema.Sample);

	const samples = [];

	const devices = await el.find(schema.Device);

	for (const device of devices) {
		samples.push({
			device: device.name,
			usage: sortUsages(await collectSamples(device.id, el, schema)).map((usage) => ({
				sample: allSamples.find((s) => s.id == usage.sample.id)?.name,
				timeframes: usage.timeframes.map((t) => [dateToInteger(t.begin), dateToInteger(t.end)]),
			})),
		});
	}
	return samples.sort((s1, s2) => s1.device.localeCompare(s2.device));
}

async function dumpDevicesForAllSamples(el: EntityLoader, schema: DrizzleSchema) {
	const allDevices = await el.find(schema.Device);
	const devices = [];
	const samples = await el.find(schema.Sample);
	for (const sample of samples) {
		devices.push({
			sample: sample.name,
			usage: sortUsages(await collectDevices(sample.id, el, schema)).map((usage) => ({
				device: allDevices.find((d) => d.id == usage.device.id)?.name,
				timeframes: usage.timeframes.map((t) => [dateToInteger(t.begin), dateToInteger(t.end)]),
			})),
		});
	}
	return devices.sort((s1, s2) => s1.sample.localeCompare(s2.sample));
}

// Helper Function to make test results/snapshots more deterministic
interface ISampleUsage {
	timeframes: ITimeframe[];
	sample: { id: string };
}

interface IDeviceUsage {
	timeframes: ITimeframe[];
	device: { id: string };
}

function sortUsages(usages: ISampleUsage[]): ISampleUsage[];
function sortUsages(usages: IDeviceUsage[]): IDeviceUsage[];
function sortUsages(usages: ISampleUsage[] | IDeviceUsage[]) {
	return usages.sort(
		(a: ISampleUsage | IDeviceUsage, b: ISampleUsage | IDeviceUsage) =>
			a.timeframes[0].begin.getTime() - b.timeframes[0].begin.getTime()
	);
}
