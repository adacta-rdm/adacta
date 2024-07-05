import { metadata } from "./utils/metadata";
import type { IResolvers } from "../generated/resolvers";

export const ImportPreset: IResolvers["ImportPreset"] = {
	async presetJSON({ id }, vars, { services: { el }, schema: { ImportPreset } }) {
		const preset = await el.one(ImportPreset, id, "preset");
		return JSON.stringify(preset);
	},

	async displayName({ id }, vars, { services: { el }, schema: { ImportPreset } }) {
		const resource = await el.one(ImportPreset, id);
		return resource.name;
	},

	async devices({ id }, _, { services: { el }, schema: { ImportPreset } }) {
		const resource = await el.one(ImportPreset, id);
		return resource.deviceIds.map((d) => ({ id: d }));
	},

	async columns({ id }, _, { services: { el }, schema: { ImportPreset } }) {
		const preset = await el.one(ImportPreset, id, "preset");
		return Object.keys(preset.columnMetadata);
	},

	metadata,
};
