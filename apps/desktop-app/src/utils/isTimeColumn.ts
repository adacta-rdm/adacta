import type { IColumnConfig, IColumnTimeConfig } from "~/lib/interface/IImportWizardPreset";

export function isTimeColumn(c?: IColumnConfig): c is IColumnTimeConfig {
	if (!c) {
		return false;
	}
	return c.type === "datetime" || c.type === "date" || c.type === "time" || c.type === "offset";
}
