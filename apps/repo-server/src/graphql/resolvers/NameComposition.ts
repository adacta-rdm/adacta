import { asc, eq } from "drizzle-orm";

import { paginateDocuments } from "./utils/paginateDocuments";
import type { IDefinedResolver } from "../IDefinedResolver";
import type { INameCompositionVariable } from "../generated/resolvers";
import { INameCompositionType } from "../generated/resolvers";

export const NameComposition: IDefinedResolver<"NameComposition"> = {
	name({ id }, _, { services: { el }, schema: { NameComposition } }) {
		return el.one(NameComposition, id, "name");
	},

	async usageType({ id }, _, { services: { repoConfig } }) {
		const deviceId = await repoConfig.getValue("DefaultDeviceNamingStrategy");
		const sampleId = await repoConfig.getValue("DefaultSampleNamingStrategy");

		if (deviceId == id && sampleId == id) {
			return INameCompositionType.DefaultDevicesAndSamples;
		} else if (deviceId == id) {
			return INameCompositionType.DefaultDevices;
		} else if (sampleId == id) {
			return INameCompositionType.DefaultSamples;
		}
	},

	async variables(
		{ id },
		_,
		{ services: { el, drizzle }, schema: { NameCompositionVariableUsage, NameCompositionVariable } }
	) {
		const variables = await drizzle
			.select()
			.from(NameCompositionVariableUsage)
			.where((e) => eq(e.nameCompositionId, id))
			.orderBy((e) => asc(e.order));

		return paginateDocuments<INameCompositionVariable>(
			await Promise.all(variables.map((v) => el.one(NameCompositionVariable, v.variableId)))
		);
	},

	legacyNameIndex({ id }, _, { services: { el }, schema: { NameComposition } }) {
		return el.one(NameComposition, id, "legacyNameIndex");
	},

	shortIdIndex({ id }, _, { services: { el }, schema: { NameComposition } }) {
		return el.one(NameComposition, id, "shortIdIndex");
	},
};
