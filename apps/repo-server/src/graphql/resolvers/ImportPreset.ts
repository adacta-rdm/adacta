import { metadata } from "./utils/metadata";
import type { IResolvers } from "../generated/resolvers";
import { IImportTransformationType } from "../generated/resolvers";

import { isICSVPreset, isIGamryPreset } from "@/tsrc/lib/interface/IImportWizardPreset";
import { ImportPresetType } from "~/drizzle/schema/repo.ImportPreset";
import { assertUnreachable } from "~/lib/assert";

export const ImportPreset: IResolvers["ImportPreset"] = {
	async presetJSON({ id }, vars, { services: { el }, schema: { ImportPreset } }) {
		const preset = await el.one(ImportPreset, id, "preset");
		return JSON.stringify(preset);
	},

	async displayName({ id }, vars, { services: { el }, schema: { ImportPreset } }) {
		const preset = await el.one(ImportPreset, id);
		return preset.name;
	},

	async type({ id }, vars, { services: { el }, schema: { ImportPreset } }) {
		const preset = await el.one(ImportPreset, id);

		switch (preset.type) {
			case ImportPresetType.CSV:
				return IImportTransformationType.Csv;
			case ImportPresetType.GAMRY:
				return IImportTransformationType.Gamry;
			default:
				assertUnreachable(preset.type);
		}
	},

	async devices({ id }, _, { services: { el }, schema: { ImportPreset } }) {
		const preset = await el.one(ImportPreset, id);
		return preset.deviceIds.map((d) => ({ id: d }));
	},

	async columns({ id }, _, { services: { el }, schema: { ImportPreset } }) {
		const preset = await el.one(ImportPreset, id, "preset");

		if (isICSVPreset(preset)) {
			return Object.keys(preset.columnMetadata);
		}

		if (isIGamryPreset(preset)) {
			return Object.values(preset.columns).map((k) => k.title);
		}

		return [];
	},

	metadata,
};
