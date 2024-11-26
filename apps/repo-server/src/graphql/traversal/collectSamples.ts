import { eq } from "drizzle-orm";

import { narrowTimeframe } from "./narrowTimeframe";
import { hasOverlapWithTimeframe } from "./utils/hasOverlapWithTimeframe";
import type { EntityLoader } from "../../services/EntityLoader";

import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import type { DrizzleSchema } from "~/drizzle/DrizzleSchema";
import { assertDefined } from "~/lib/assert/assertDefined";
import type { IDeviceId, ISampleId } from "~/lib/database/Ids";

export interface ISampleUsageInfo {
	id: ISampleId;
	begin: Date;
	end?: Date | null;
	pathFromTopLevelDevice: string[];
}

interface IDeviceUsageInfo {
	id: IDeviceId;
	// The parents property name of this device
	propertyName?: string;
	// Begin can be undefined if a deviceID is passed to goUpwardsAndCollectPropertyValues.
	// The function will discover the device identified by the given deviceId with the given begin/end (which can be undefined)
	begin?: Date;
	end?: Date | null;
	pathFromTopLevelDevice: string[];
}

export interface ITimeframe {
	begin: Date;
	end?: Date | null;
}

/**
 * Recursively collects all samples which are used together with the device specified by `deviceId`
 * and groups them by their id. The sample ids in the returned array are guaranteed to unique.
 */
export async function collectSamples(
	deviceId: IDeviceId,
	el: EntityLoader,
	schema: DrizzleSchema,
	collectionFn = () => goUpwardsAndCollectPropertyValues(deviceId, el, schema)
): Promise<{ timeframes: TTimeFrameWithPath[]; sample: { id: ISampleId } }[]> {
	const collection = await collectionFn();
	const usagesByDevice = groupUsages(collection[0]);

	// Merge timeframes
	return [...usagesByDevice.entries()].map(([id, timeframe]) => {
		return {
			sample: { id },
			timeframes: mergeTimeframes(timeframe),
			//slots: timeframe.map((t) => t.pathFromTopLevelDevice),
		};
	});
}

/**
 * Recursively collects all devices which are used together with the sample specified by `sampleId`
 * and groups them by their id. The device ids in the returned array are guaranteed to unique.
 */
export async function collectDevices(
	sampleId: ISampleId,
	el: EntityLoader,
	schema: DrizzleSchema
): Promise<{ timeframes: ITimeframe[]; device: { id: IDeviceId } }[]> {
	const collection = await goUpwardsAndCollectPropertyValues(
		sampleId,
		el,
		schema,
		undefined,
		undefined,
		true
	);
	const usagesByDevice = groupUsages(collection[1]);

	// Merge timeframes
	return [...usagesByDevice.entries()].map(([id, timeframe]) => {
		return {
			device: { id },
			timeframes: mergeTimeframes(timeframe),
		};
	});
}

// TODO: As discussed with @jr this file should be split. Not doing it now to avoid conflicts and a ton of
//  unrelated changes.
/**
 * Returns the ids of all sub devices that were fitted in the device with the given id in the given time period.
 * @param deviceId Id of the top level device
 * @param dbm
 * @param begin of considered timespan
 * @param end dof considered timespan
 */
interface IPropertyWithPathOfDevice<T = { id: IDeviceId } | { id: ISampleId }> {
	component: T;
	pathFromTopLevelDevice: string[];
	installDate: Date;
	removeDate?: Date;
}

/**
 * @deprecated Use `collectPropertiesWithPathOfDeviceObject` instead. It returns a more structured
 * object which allows the caller to distinguish between samples and devices.
 */
export async function collectPropertiesWithPathOfDevice(
	deviceId: IDeviceId,
	el: EntityLoader,
	schema: DrizzleSchema,
	begin?: Date,
	end?: Date
): Promise<Array<IPropertyWithPathOfDevice>> {
	const { samples, devices } = await collectPropertiesWithPathOfDeviceObject(
		deviceId,
		el,
		schema,
		begin,
		end
	);
	return [...samples, ...devices];
}

export async function collectPropertiesWithPathOfDeviceObject(
	deviceId: IDeviceId,
	el: EntityLoader,
	schema: DrizzleSchema,
	begin?: Date,
	end?: Date
): Promise<{
	samples: Array<IPropertyWithPathOfDevice<{ id: ISampleId }>>;
	devices: Array<IPropertyWithPathOfDevice<{ id: IDeviceId }>>;
}> {
	const [samples, devices] = await goDownwardsAndCollectPropertyValues(
		deviceId,
		el,
		schema,
		begin,
		end
	);
	return {
		samples: [...samples].map((s) => ({
			component: { id: s.id },
			pathFromTopLevelDevice: s.pathFromTopLevelDevice,
			installDate: s.begin,
			removeDate: s.end ?? undefined,
		})),
		devices: [...devices].map((d) => {
			assertDefined(d.begin, "Begin of device usage undefined");
			return {
				component: { id: d.id },
				pathFromTopLevelDevice: d.pathFromTopLevelDevice,
				installDate: d.begin,
				removeDate: d.end ?? undefined,
			};
		}),
	};
}

/**
 * Recursively collects all samples and devices which are used together with `deviceId` and any other devices
 * related to that device. The samples and devices can be optionally constrained to a timeframe by specifying
 * the args `begin` and `end`.
 *
 * @param startId either a deviceId or a sampleId (set startIdIsSample? to true if you pass a sampleId)
 * @param el
 * @param schema
 * @param begin
 * @param end
 * @param startIdIsSample needs to be set to true if startId is a sample
 */
async function goUpwardsAndCollectPropertyValues<T extends boolean = false>(
	startId: T extends true ? ISampleId : IDeviceId,
	el: EntityLoader,
	schema: DrizzleSchema,
	begin?: Date,
	end?: Date,
	startIdIsSample?: T
): Promise<[ISampleUsageInfo[], IDeviceUsageInfo[]]> {
	const devices: IDeviceUsageInfo[] = [];
	if (!startIdIsSample) {
		devices.push({ id: startId as IDeviceId, begin, end, pathFromTopLevelDevice: [] });
	}
	const promises: Promise<[ISampleUsageInfo[], IDeviceUsageInfo[]]>[] = [];

	const { Property } = schema;

	// Get devices which use current device
	const properties = await el.find(
		Property,
		isEntityId(startId, "Device") ? eq(Property.deviceId, startId) : eq(Property.sampleId, startId)
	);
	// const properties = await db.query("property/by_value", {
	// 	key: startId,
	// 	include_docs: true,
	// });
	// const propertyIds = await loader(Property).many("value", startId);
	// const properties = await Promise.all(propertyIds.map(({ id }) => loader(Property).one(id)));

	// Continue upwards traversal from all devices which are using this device as property
	for (const property of properties) {
		if (!hasOverlapWithTimeframe(property, begin, end)) {
			continue;
		}

		const [a, b] = narrowTimeframe(
			[new Date(property.begin), begin],
			[property.end ? new Date(property.end) : undefined, end]
		);
		promises.push(goUpwardsAndCollectPropertyValues(property.ownerDeviceId, el, schema, a, b));
	}

	// Traverse downwards from this device and collect samples on the way
	// Downwards traversal needs to start on every device (and not only a top level device) as downwards traversal
	// respects property validity and narrows down search area depending on the path (which itself depends on the starting point)
	if (!startIdIsSample) {
		promises.push(
			goDownwardsAndCollectPropertyValues(startId as IDeviceId, el, schema, begin, end)
		);
	}

	const p = await Promise.all(promises);
	const s: ISampleUsageInfo[][] = p.map((s) => s[0]);
	const d: IDeviceUsageInfo[][] = p.map((s) => s[1]);
	return [s.flat(), [...devices, ...d.flat()]];
}

/**
 * Traverses down from a given device by checking all properties for samples.
 * If a device is found it will get used as starting point to recursively find further samples
 * The considered timeframe will get narrowed down for each step according to validity of the property.
 *
 * The returned data structure probably contains some timeframes multiple times.
 * This is because different samples/devices have different (overlapping) periods of validity depending on the path on which they were discovered.
 * Use either mergeTimeframes to merge an array of `ITimeFrames` to get rid of these timeframes.
 * @param deviceId Device ID
 * @param el
 * @param schema
 * @param begin
 * @param end
 * @param currentPath
 */
async function goDownwardsAndCollectPropertyValues(
	deviceId: IDeviceId,
	el: EntityLoader,
	schema: DrizzleSchema,
	begin?: Date,
	end?: Date,
	currentPath: string[] = []
): Promise<[ISampleUsageInfo[], IDeviceUsageInfo[]]> {
	const { Property } = schema;
	const properties = await el.find(Property, eq(Property.ownerDeviceId, deviceId));

	// To accumulate all samples
	const samples: ISampleUsageInfo[] = [];
	const devices: IDeviceUsageInfo[] = [];
	const promises: Promise<[ISampleUsageInfo[], IDeviceUsageInfo[]]>[] = [];

	// Add all properties which are devices into the queue
	for (const property of properties) {
		// Check if property is valid for the timeframe which we are looking for
		if (!hasOverlapWithTimeframe(property, begin, end)) {
			continue;
		}

		// Narrow down the timeframe
		const [a, b] = narrowTimeframe(
			[new Date(property.begin), begin],
			[property.end ? new Date(property.end) : undefined, end]
		);
		assertDefined(a); // "a" is defined since at least property.begin is defined

		// If a sample is found, add it to the list of samples with the narrowed time range.
		const pathToNewlyDiscoveredDevice = [...currentPath, property.name];

		if (property.sampleId) {
			samples.push({
				id: property.sampleId,
				begin: a,
				end: b,
				pathFromTopLevelDevice: pathToNewlyDiscoveredDevice,
			});
		}

		// If a device is found we use it to recursively discover further devices/samples
		// For the recursive call the time gets narrowed according to timespan in which the device is used
		else if (property.deviceId) {
			devices.push({
				id: property.deviceId,
				propertyName: property.name,
				begin: a,
				end: b,
				pathFromTopLevelDevice: pathToNewlyDiscoveredDevice,
			});

			promises.push(
				goDownwardsAndCollectPropertyValues(
					property.deviceId,
					el,
					schema,
					a,
					b,
					pathToNewlyDiscoveredDevice
				)
			);
		}
	}

	const p = await Promise.all(promises);
	const s: ISampleUsageInfo[][] = p.map((s) => s[0]);
	const d: IDeviceUsageInfo[][] = p.map((s) => s[1]);
	samples.push(...s.flat());
	devices.push(...d.flat());

	return [samples, devices];
}

type TTimeFrameWithPath = ITimeframe & { pathFromTopLevelDevice: string[] };

type TGroupedUsages<T extends ISampleUsageInfo | IDeviceUsageInfo> = Map<
	T["id"],
	TTimeFrameWithPath[]
>;
/**
 * Groups usages by sample/device (like needed for the resolver)
 * @param usages
 */
function groupUsages<T extends ISampleUsageInfo | IDeviceUsageInfo>(
	usages: T[]
): TGroupedUsages<T> {
	const groupedUsages: TGroupedUsages<T> = new Map();

	// Group collected samples by sample
	for (const usage of usages) {
		const id = usage.id;
		const { begin, end, pathFromTopLevelDevice } = usage;
		// Begin is defined as each usage has a time when it started (derived from a property begin)
		assertDefined(begin);

		const timeframes = groupedUsages.get(id) ?? [];
		timeframes.push({ begin, end, pathFromTopLevelDevice });
		groupedUsages.set(id, timeframes);
	}

	return groupedUsages;
}

/**
 * Takes an array of ITimeframe and merges those timeframes which overlap together.
 * @param timeframes
 */
function mergeTimeframes(timeframes: TTimeFrameWithPath[]) {
	if (timeframes.length <= 1) return timeframes;

	timeframes = timeframes.sort((a, b) => a.begin.getTime() - b.begin.getTime());

	const stack: TTimeFrameWithPath[] = [];
	stack.push(timeframes[0]);

	for (let i = 1; i < timeframes.length; i++) {
		const element = stack[stack.length - 1];

		if ((element.end ?? Infinity) < timeframes[i].begin) {
			// No overlap detected
			stack.push(timeframes[i]);
		} else if ((element.end ?? Infinity) < (timeframes[i].end ?? Infinity)) {
			// Merge timeframes by extending current element
			element.end = timeframes[i].end;
			stack.pop();
			stack.push(element);
		}
	}

	return stack;
}
