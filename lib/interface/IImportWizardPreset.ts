import type { IDatetime } from "../createDate";

import type { IColumnConfigBase } from "~/apps/desktop-app/src/components/importWizzard/ImportWizard";
import type { IDataArea } from "~/apps/repo-server/src/csvImportWizard/CSVImportWizard";

export interface IImportWizardPreset {
	delimiter: string;
	decimalSeparator: string;
	preview?: number;
	dataArea: IDataArea;
	columnMetadata: Record<string, IColumnConfig>;
	manualDateConfig?: {
		begin: IDatetime;
		end: IDatetime;
	};
}

interface IColumnTypeNumber extends IColumnConfigBase {
	type: "number";
}

interface IColumnTypeSkip extends IColumnConfigBase {
	type: "skip";
}

interface ITimezoneInfo {
	timezone: string; // Europe/Berlin
}

interface IColumnTypeDateTimeCombined extends IColumnConfigBase, ITimezoneInfo {
	type: "datetime";
	format: string; // YYYY-MM-DD hh:mm:ss
}

export interface IColumnTypeTime extends IColumnConfigBase, ITimezoneInfo {
	type: "time";
	format: string; // hh:mm:ss

	/**
	 * The id of the corresponding date column (only for time columns without an offset)
	 */
	partnerColumnId?: string;

	/**
	 * Unix timestamp in ms (only for time columns without a corresponding date column)
	 */
	startDate?: number;
}

export interface IColumnTypeDate extends IColumnConfigBase, ITimezoneInfo {
	type: "date";
	format: string; // YYYY-MM-DD

	partnerColumnId?: string; // Time columns should not exist without a corresponding date column
}

interface IColumnTypeTimeOffset extends IColumnConfigBase, ITimezoneInfo {
	type: "offset";
	/**
	 * Unix timestamp in ms
	 */
	startDate: number;

	/**
	 * Factor that is multiplied with the original value in table to convert the value to ms.
	 */
	conversionFactor: number;
}
export type IColumnTimeConfig =
	| IColumnTypeDateTimeCombined
	| IColumnTypeTime
	| IColumnTypeDate
	| IColumnTypeTimeOffset;

export type IColumnConfig = IColumnTimeConfig | IColumnTypeNumber | IColumnTypeSkip;
