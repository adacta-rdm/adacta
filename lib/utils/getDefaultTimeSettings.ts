import type { ITimeSettings } from "../interface/ITimeSettings";

export function getDefaultTimeSettings(): ITimeSettings {
	return {
		timeStyle: "short",
		dateStyle: "short",
		locale: "de-DE",
	};
}
