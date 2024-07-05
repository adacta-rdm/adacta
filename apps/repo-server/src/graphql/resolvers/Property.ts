import type { IResolvers } from "../generated/resolvers";

import { createIDatetime } from "~/lib/createDate";

export const Property: IResolvers["Property"] = {
	async timestamp({ id }, _, { services: { el }, schema: { Property } }) {
		const begin = await el.one(Property, id, "begin");
		return createIDatetime(begin);
	},

	async timestampEnd({ id }, _, { services: { el }, schema: { Property } }) {
		const end = await el.one(Property, id, "end");
		if (!end) return null;
		return createIDatetime(end);
	},

	name({ id }, _, { services: { el }, schema: { Property } }) {
		return el.one(Property, id, "name");
	},

	async device({ id }, _, { services: { el }, schema: { Property } }) {
		return { id: await el.one(Property, id, "ownerDeviceId") };
	},

	async value({ id }, _, { services: { el }, schema: { Property } }) {
		const property = await el.one(Property, id);

		if (property.deviceId) {
			return {
				type: "Device",
				id: property.deviceId,
			};
		}

		if (property.sampleId) {
			return {
				type: "Sample",
				id: property.sampleId,
			};
		}

		throw new Error(`Property ${id} has neither deviceId nor sampleId.`);
	},
};
