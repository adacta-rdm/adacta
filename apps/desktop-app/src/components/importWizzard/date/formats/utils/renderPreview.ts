import moment from "moment";

import { parseTimeInformation } from "~/lib/datetime/parseTimeInformation";
import type { IColumnTimeConfig } from "~/lib/interface/IImportWizardPreset";

export function renderPreview(
	dataRow: string[],
	headerRow: string[],
	config: IColumnTimeConfig,
	options: {
		decimalSeparator?: string;
		targetFormat?: string;
	}
) {
	if (dataRow === undefined) {
		return;
	}

	const targetFormat = options.targetFormat ?? "YYYY-MM-DD HH:mm:ss.SSS";
	const decimalSeparator = options.decimalSeparator ?? "";

	try {
		const parsed = parseTimeInformation(
			dataRow[headerRow.findIndex((v) => v === config.columnId)],
			config,
			decimalSeparator
		);
		return moment(parsed).format(targetFormat);
	} catch (e) {
		return "";
	}
}
