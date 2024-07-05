import { EuiFlexItem, EuiForm, EuiSpacer } from "@elastic/eui";
import React, { useState } from "react";

import { Steps } from "./Steps";
import { Spreadsheet } from "../../spreadsheet/Spreadsheet";
import type { IImportWizardFormControls } from "../ImportWizard";
import { HeuristicDateExtraction } from "../date/extraction/DateExtractionWizard";

import type { IGenericTable } from "~/apps/repo-server/src/csvImportWizard/CSVImportWizard";
import type { IColumnConfig } from "~/lib/interface/IImportWizardPreset";

export function StepTime(props: {
	errors: string[];
	formControls: IImportWizardFormControls;

	setConfig: (config: Record<string, IColumnConfig>) => void;
	createStateUpdater: <K extends keyof IImportWizardFormControls>(
		controlName: K
	) => (v: IImportWizardFormControls[K]) => void;
	genericTable: IGenericTable;
	createRowFromMap: (
		header: string[],
		map: Map<string, string> | Map<string, React.ReactElement>
	) => (string | React.ReactElement<any, string | React.JSXElementConstructor<any>>)[];
	columnTypeHeader: Map<string, string>;
	updateColumnsSelection: (columns: number[], columnsGlobal: number[]) => void;
	showStep: (step: Steps) => void;
}) {
	const {
		errors,
		formControls,
		genericTable,
		createRowFromMap,
		columnTypeHeader,
		updateColumnsSelection,
		showStep,
		createStateUpdater,
	} = props;

	const [selectedColumns, setSelectedColumns] = useState<number[]>([]);

	return (
		<EuiFlexItem>
			<EuiForm isInvalid={errors.length > 0} error={errors}>
				<HeuristicDateExtraction
					headers={genericTable.header}
					columnMetadata={formControls.columnMetadata}
					selectedColumns={selectedColumns}
					setConfig={props.setConfig}
					skipToNextStep={() => showStep(Steps.COLUMN_METADATA)}
					manualDateExtraction={{
						begin: {
							date: formControls.manualStartDate,
							setDate: (date) => {
								createStateUpdater("manualStartDate")(date);
							},
						},
						end: {
							date: formControls.manualEndDate,
							setDate: (date) => {
								createStateUpdater("manualEndDate")(date);
							},
						},
					}}
				/>
				<EuiSpacer />
			</EuiForm>
			<EuiSpacer />
			<Spreadsheet
				rows={[
					genericTable.header,
					createRowFromMap(genericTable.headerInternal, columnTypeHeader),
					...genericTable.body,
				].map((row) => row.map((value) => ({ value })))}
				headerOptions={{
					artificialHeaderColumns: true,
					artificialHeadersColumnFirstRows: ["Title", "Type"],
					headerRows: [0],
				}}
				onSelectedColumnsChange={(a, b) => {
					updateColumnsSelection(a, b);
					setSelectedColumns(b);
				}}
			/>
		</EuiFlexItem>
	);
}
