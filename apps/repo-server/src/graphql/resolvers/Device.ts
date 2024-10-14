import assert from "node:assert";

import { and, eq, gt, isNull, lte, notExists, notInArray, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm/sql/sql";
import { isEqual } from "lodash-es";

import { metadata } from "./utils/metadata";
import { notes } from "./utils/notes";
import { timeFrameArgumentInterpretation } from "./utils/timeFrameArgumentInterpretation";
import { usageInResource } from "./utils/usageInResource";
import { findRootDevicesWithinTimeframe } from "../../utils/findRootDevicesWithinTimeframe";
import type { IProject, IResolvers } from "../generated/resolvers";
import { collectPropertiesWithPathOfDevice, collectSamples } from "../traversal/collectSamples";

import { paginateDocuments } from "~/apps/repo-server/src/graphql/resolvers/utils/paginateDocuments";
import { serverSideSpecifications } from "~/apps/repo-server/src/graphql/resolvers/utils/serverSideSpecifications";
import { usagesAsProperty } from "~/apps/repo-server/src/graphql/resolvers/utils/usagesAsProperty";
import { isEntityId } from "~/apps/repo-server/src/utils/isEntityId";
import { assertDefined } from "~/lib/assert/assertDefined";
import {
	createDate,
	createIDatetime,
	createMaybeDate,
	createMaybeIDatetime,
} from "~/lib/createDate";
import { collectRelatedDefinitions } from "~/lib/inheritance/resolver/collectRelatedDefinitions";
import { splitPropertyNameIntoVirtualGroups } from "~/lib/utils/splitPropertyNameIntoVirtualGroups";

export const Device: IResolvers["Device"] = {
	name({ id }, _, { services: { el }, schema: { Device } }) {
		return el.one(Device, id, "name");
	},

	displayName({ id }, _, { services: { nameComposition } }) {
		return nameComposition.getName({ type: "Device", id });
	},

	shortId({ id }, _, { services: { el }, schema: { Device } }) {
		return el.one(Device, id, "shortId");
	},

	async specifications({ id }, { names }, { services: { el }, schema }) {
		if (names) {
			return (await serverSideSpecifications({ type: "Device", id }, { el, schema })).filter(
				({ name }) =>
					// Turn all specification names to lowercase to make the "names" argument
					// case-insensitive
					names.map((n) => n.toLowerCase()).includes(name.toLowerCase())
			);
		}

		const { DeviceSpecification } = schema;

		assert(isEntityId(id, "Device"));
		return el.drizzle.select().from(DeviceSpecification).where(eq(DeviceSpecification.ownerId, id));
	},

	async imageResource({ id }, _, { services: { el }, schema: { Device } }) {
		const imageResources = await el.one(Device, id, "imageResourceIds");
		return imageResources.map((id) => ({ id }));
	},

	async setupDescription({ id }, _, { services: { el }, schema: { Device } }) {
		const setupDescriptions = await el.one(Device, id, "setupDescription");

		return setupDescriptions.map((setupDescription) => ({
			// We inject an artificial ID to allow relay to properly apply updates to the array of
			// setup descriptions
			id: `${setupDescription.imageResource}_setupDescription`,
			...setupDescription,
			imageResource: { id: setupDescription.imageResource },
		}));
	},

	async definition({ id }, _, { services: { el }, schema: { Device } }) {
		const definitionId = await el.one(Device, id, "definitionId");
		return { id: definitionId };
	},

	async definitions({ id }, _, { services: { el }, schema }) {
		return (await collectRelatedDefinitions(id, { el, schema })).map((d) => ({
			definition: { id: d.definition },
			level: d.level,
		}));
	},

	properties({ id }, vars, { services: { drizzle }, schema: { Property } }) {
		const conditions: (SQL<unknown> | undefined)[] = [eq(Property.ownerDeviceId, id)];

		if (vars.timestamp) {
			const timestamp = createDate(vars.timestamp);

			// begin <= timestamp < end
			conditions.push(
				lte(Property.begin, timestamp),
				or(isNull(Property.end), gt(Property.end, timestamp))
			);
		}

		return drizzle
			.select({ id: Property.id })
			.from(Property)
			.where(and(...conditions));
	},

	async parent({ id }, vars, { services: { drizzle }, schema: { Property } }) {
		const timestamp = vars.timestamp ? new Date(vars.timestamp) : new Date();

		const parentIds = await drizzle
			.select({ id: Property.ownerDeviceId })
			.from(Property)
			.where(
				and(
					eq(Property.deviceId, id),
					lte(Property.begin, timestamp),
					or(isNull(Property.end), gt(Property.end, timestamp))
				)
			);

		assert(
			parentIds.length <= 1,
			`Device ${id} has more than one parent at ${timestamp.toISOString()}`
		);

		if (parentIds.length === 0) return null;

		return parentIds[0];
	},

	async samples({ id }, _, { services: { el }, schema }) {
		return (await collectSamples(id, el, schema)).map((s) => ({
			...s,
			timeframes: s.timeframes.map((t) => ({
				begin: createIDatetime(t.begin),
				end: createMaybeIDatetime(t.end),
				pathFromTopLevelDevice: t.pathFromTopLevelDevice,
			})),
		}));
	},

	async components({ id }, { timeFrame, time, includeOverlaps }, { services: { el }, schema }) {
		if (time !== undefined && timeFrame !== undefined) {
			throw new Error("You can either provide `timeFrame` or `time`");
		}

		const [begin, end] = timeFrameArgumentInterpretation(time, timeFrame);
		const properties = await collectPropertiesWithPathOfDevice(id, el, schema, begin, end);
		const components = properties.map((p) => ({
			...p,
			installDate: createIDatetime(p.installDate),
			removeDate: createMaybeIDatetime(p.removeDate),
		}));

		if (includeOverlaps) {
			return components;
		} else {
			// Remove all devices which aren't part of the device for the whole timeframe
			return components.filter((c) => {
				const beginDate = createDate(c.installDate);
				const endDate = createMaybeDate(c.removeDate);
				assertDefined(begin);

				// If the search area has an open end the component needs to be installed up until
				// now too
				if (end === undefined && endDate !== undefined) {
					return false;
				}

				// If I'm not mistaken end should be defined at this point
				// Case 1:  end undefined, endDate not undefined (function returns above)
				// Case 2:  end undefined, endDate undefined (lazy evaluation with
				// 			endDate === undefined in front of end usage)
				// Case 3:	end defined ...
				assertDefined(end);
				return beginDate <= begin && (endDate === undefined || endDate >= end);
			});
		}
	},

	usageInResource({ id }, _, { services: { el }, schema }) {
		return usageInResource(id, el, schema);
	},

	async topLevelDevice({ id }, { timestamp }, { services: { el }, schema: { Property } }) {
		const time = createMaybeDate(timestamp) ?? new Date();
		const topLevelDevice = (await findRootDevicesWithinTimeframe(id, el, Property, time, time))[0];
		if (topLevelDevice.device !== id) {
			return { device: { id: topLevelDevice.device }, path: topLevelDevice.path };
		}
		return null;
	},

	/**
	 * Returns a list of all devices and samples that are free to use as a subcomponent. This list is used to populate
	 * a dropdown in the UI.
	 *
	 *
	 */
	async freeComponents({ id }, vars, { services: { el }, schema: { Property, Device, Sample } }) {
		//
		//
		//              4                 10
		//            begin              end
		//              │                 │
		//              │  5        8     │
		//              │  ┌────────┐     │
		//              │  └────────┘     │
		//     1        │     6        9  │     12
		//     ┌────────┼─────┐        ┌──┼─────┐
		//     └────────┼─────┘        └──┼─────┘
		//  0        3  │                 │     12        15
		//  ┌────────┐  │                 │     ┌─────────┐
		//  └────────┘  │                 │     └─────────┘
		//              │                 │
		//
		//  ──────────────────────────────────────────────────────►
		//  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^       time
		//  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15
		//
		// The subquery must select all items between the lines marked with `begin` and `end`. The `end` parameter
		// is optional and defaults to null. When `end` is null, the subquery must select all items right of the
		// `begin` line.
		// This translates to the following conditions:
		//     (property.end IS NULL
		// OR  property.end > begin)
		// AND property.begin <= end

		const begin = createDate(vars.begin);
		const end = createMaybeDate(vars.end);

		// Determine all root devices within the given timeframe.
		// These must be excluded from the list of free components to prevent loops.
		const exclude = (await findRootDevicesWithinTimeframe(id, el, Property, begin, end)).map(
			(roots) => roots.device
		);

		// Exclude the device itself
		exclude.push(id);

		// Conditions for the subquery. Note that everything included in the subquery will be excluded from the outer
		// result set since we are using `not exists`.
		let conditions = [
			// The "right" part of the bar left of the "begin" line
			or(isNull(Property.end), gt(Property.end, begin)),
		];

		if (end) {
			conditions.push(lte(Property.begin, end));
		}

		if (isEntityId(vars.ignoreProperty, "Property")) {
			conditions = [or(eq(Property.id, vars.ignoreProperty), and(...conditions))];
		}

		const devices = el.find(
			Device,
			and(
				notInArray(Device.id, exclude),
				// Exclude items that are already installed somewhere
				notExists(
					el.drizzle
						.select()
						.from(Property)
						.where(
							and(
								// The "join" between the outer and inner query
								eq(Property.deviceId, Device.id),
								...conditions
							)
						)
				)
			)
		);

		const samples = el.find(
			Sample,
			// Exclude items that are already installed somewhere
			notExists(
				el.drizzle
					.select()
					.from(Property)
					.where(
						and(
							// The "join" between the outer and inner query
							eq(Property.sampleId, Sample.id),
							...conditions
						)
					)
			)
		);

		const [d, s] = await Promise.all([devices, samples]);

		return [...d.map(({ id }) => ({ id })), ...s.map(({ id }) => ({ id }))];
	},

	async componentsInSlot({ id }, { path }, { services: { el }, schema }) {
		const components = (
			await collectPropertiesWithPathOfDevice(id, el, schema, new Date("1990"), undefined)
		) // TODO: Why is this "1990" and not 0 (int)
			.filter((p) => isEqual(splitPropertyNameIntoVirtualGroups(p.pathFromTopLevelDevice), path));
		return components.map((c) => ({
			id: `${c.component.id}__node`,
			...c,
			installDate: createIDatetime(c.installDate),
			removeDate: c.removeDate ? createIDatetime(c.removeDate) : undefined,
		}));
	},

	async projects({ id }, _, { services: { drizzle }, schema: { ProjectToDevice } }) {
		const projects = await drizzle
			.select({ id: ProjectToDevice.projectId })
			.from(ProjectToDevice)
			.where(eq(ProjectToDevice.deviceId, id));

		return paginateDocuments<IProject>(projects);
	},

	usagesAsProperty,
	notes,
	metadata,
};
