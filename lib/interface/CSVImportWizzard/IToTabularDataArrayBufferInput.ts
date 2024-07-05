import type { IDatetime } from "../../createDate";

import type { IDataArea } from "~/apps/repo-server/src/csvImportWizard/CSVImportWizard";

export interface IToTabularDataArrayBufferInput {
	preview?: number;
	delimiter: string;
	dataArea: IDataArea;
	// normalizers: { [columnName: string]: string }; // Omit
	decimalSeparator: string;
	columnMetadata: Record<string, any>; // any = IColumnConfig
	manualDateConfig?: { begin: IDatetime; end: IDatetime };
}
