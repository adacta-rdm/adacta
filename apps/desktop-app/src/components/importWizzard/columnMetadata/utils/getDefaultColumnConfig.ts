import type { IColumConfigWithoutIdAndName } from "~/lib/importWizard/IColumnConfigWithoutId";
import type { IColumnConfig } from "~/lib/interface/IImportWizardPreset";

const defaults: {
	[key in IColumnConfig["type"]]: IColumConfigWithoutIdAndName;
} = {
	offset: {
		type: "offset",
		conversionFactor: 1000,
		timezone: "Europe/Berlin",
		// Use current time as default. This way the DatePicker will offer years around the
		// current year. Drop milliseconds to make UI less confusing
		startDate: Math.floor(new Date().getTime() / 1000) * 1000,
		normalizerIds: [],
	},
	datetime: {
		type: "datetime",
		timezone: "Europe/Berlin",
		format: "YYYY-MM-DD HH:mm:ss",
		normalizerIds: [],
	},
	date: {
		type: "date",
		format: "YYYY-MM-DD",
		timezone: "Europe/Berlin",
		normalizerIds: [],
	},
	time: {
		type: "time",
		format: "HH:mm:ss",
		timezone: "Europe/Berlin",
		normalizerIds: [],
	},
	number: {
		type: "number",
		normalizerIds: [],
	},
	skip: {
		type: "skip",
		normalizerIds: [],
	},
};

export function getDefaultColumnConfig(type: keyof typeof defaults) {
	return defaults[type];
}
