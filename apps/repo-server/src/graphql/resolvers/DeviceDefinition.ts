import { and, eq, gt } from "drizzle-orm";

import { deviceDefinitionUsages } from "./utils/deviceDefinitionUsages";
import { metadata } from "./utils/metadata";
import type { IPropertyType, IResolvers } from "../generated/resolvers";

import { arrayAgg } from "~/drizzle/queryHelpers/arrayAgg";
import { collectRelatedDefinitions } from "~/lib/inheritance/resolver/collectRelatedDefinitions";

export const DeviceDefinition: IResolvers["DeviceDefinition"] = {
	name({ id }, _, { services: { el }, schema: { DeviceDefinition } }) {
		return el.one(DeviceDefinition, id, "name");
	},

	async imageResource({ id }, _, { services: { el }, schema: { DeviceDefinition } }) {
		return (await el.one(DeviceDefinition, id, "imageResourceIds")).map((id) => ({ id }));
	},

	async propertyDefinitions({ id }, _, { services: { drizzle }, schema: { Device, Property } }) {
		// Returns the list of properties that all Device entities of this DeviceDefinition have.
		const properties = await drizzle
			.selectDistinct({
				name: Property.name,
				// Device + Sample IDs are used to figure out whether the property is a Device or Sample property
				// Aggregation is used to ensure that the same property is not returned multiple times
				deviceIds: arrayAgg(Property.deviceId),
				sampleIds: arrayAgg(Property.sampleId),
			})
			.from(Property)
			.innerJoin(Device, eq(Property.ownerDeviceId, Device.id))
			.where(eq(Device.definitionId, id))
			.orderBy(Property.name)
			.groupBy(Property.name); // Group by name to ensure every name is returned only once

		return properties.map((p) => ({
			name: p.name,
			type: (p.deviceIds !== null ? "Device" : "Sample") as IPropertyType,
		}));
	},

	specifications({ id }, _, { services: { el }, schema: { DeviceDefinitionSpecification } }) {
		return el.drizzle
			.select()
			.from(DeviceDefinitionSpecification)
			.where(eq(DeviceDefinitionSpecification.ownerId, id));
	},

	acceptsUnit({ id }, _, { services: { el }, schema: { DeviceDefinition } }) {
		return el.one(DeviceDefinition, id, "acceptsUnit");
	},

	async definitions({ id }, input, { services: { el }, schema }) {
		return (await collectRelatedDefinitions(id, { el, schema })).map((d) => ({
			definition: { id: d.definition },
			level: d.level,
		}));
	},

	async derivedDefinitionsFlat(
		{ id },
		_,
		{ services: { drizzle }, schema: { DeviceDefinitionPaths } }
	) {
		// Note: This implementation pulls the entire DeviceDefinition collection from the database
		// and filters it in memory. In case performance becomes an issue, this is the place to optimize.

		return drizzle
			.select({ id: DeviceDefinitionPaths.descendantId })
			.from(DeviceDefinitionPaths)
			.where(and(eq(DeviceDefinitionPaths.ancestorId, id), gt(DeviceDefinitionPaths.depth, 0)));
	},

	usages({ id }, _, { services: { el }, schema }) {
		return deviceDefinitionUsages(id, el, schema);
	},

	metadata,
};
