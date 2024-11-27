import assert from "assert";

import { EuiButton, EuiCallOut, EuiFormRow, EuiLink, EuiSpacer } from "@elastic/eui";
import React from "react";

import type { IDateState } from "./ManualDateExtraction";
import { ManualDateExtraction } from "./ManualDateExtraction";
import { DatePickerClearable } from "../../../datepicker/DatePicker";

import {
	localDateToTimezoneDate,
	timezoneDateToLocalDate,
} from "~/lib/datetime/TimezoneConversion";
import type { IColumnConfig } from "~/lib/interface/IImportWizardPreset";

enum DateExtractionModes {
	absolute = "absolute",
	relative = "relative",
	manual = "manual",
}

export enum DateExtractionModeNextStep {
	link = "link", // Link date columns with time columns
	offset = "offset", // Specify offset for time columns without date
	linkAndOffset = "linkAndOffset", // Link date columns with time columns and specify offset for time columns without date
	manual = "manual", // Manually specify date and time

	done = "done", // Done
	error = "error",
}

interface IProps {
	columnMetadata: Record<string, IColumnConfig>;

	headers: string[];
	selectedColumns: number[];

	setConfig: (config: Record<string, IColumnConfig>) => void;

	skipToNextStep: () => void;

	manualDateExtraction: { begin: IDateState; end: IDateState };
}

export function determineDateExtractionMode(columnMetadata: Record<string, IColumnConfig>) {
	let mode: DateExtractionModes | undefined = undefined;
	let nextStep: DateExtractionModeNextStep = DateExtractionModeNextStep.done;

	const columns = Object.values<IColumnConfig>(columnMetadata);

	// Map to keep track of the number of columns of each type
	const map = new Map<string, number>();

	// Check if there is any date information in the data at all (used to determine if the user has
	// to specify the date manually)
	let dateInformationFound = false;
	for (const col of columns) {
		let e = map.get(col.type) ?? 0;

		if (
			col.type == "date" ||
			col.type == "time" ||
			col.type == "datetime" ||
			col.type == "offset"
		) {
			dateInformationFound = true;
		}

		// Don't count time columns that are linked to date columns
		if ((col.type == "time" || col.type == "date") && col.partnerColumnId !== undefined) {
			e -= 1;
		}

		// Don't count time columns that have a start date (they don't need a date column)
		if (col.type == "time" && col.startDate !== undefined) {
			e -= 1;
		}

		map.set(col.type, e + 1);
	}

	const time = map.get("time") ?? 0;
	const date = map.get("date") ?? 0;

	const helpText: string[] = [];

	// If there is no time information the user has to specify the time manually
	if (!dateInformationFound) {
		mode = DateExtractionModes.manual;
		nextStep = DateExtractionModeNextStep.manual;
		helpText.push(
			"No date and time information found. Enter the date and time of the recording manually. If your data contains date and time information, configure the appropriate columns in step 2."
		);

		return { mode, nextStep, helpText };
	}

	if (date !== time) {
		if (date > time) {
			helpText.push("There are date columns without time columns"); // ERROR ?
			mode = undefined;
			nextStep = DateExtractionModeNextStep.error;
		} else {
			helpText.push(
				"There are time columns that lack associated date information. Assign a date to the time column or link the time column with a date column. To link columns, select both the time and date columns simultaneously and confirm the selection."
			); // WARNING
			mode = DateExtractionModes.relative;

			if (time == 1) {
				nextStep = DateExtractionModeNextStep.offset;
			} else {
				nextStep = DateExtractionModeNextStep.linkAndOffset;
			}
		}

		return { mode, nextStep, helpText };
	}

	if (date == time) {
		mode = DateExtractionModes.absolute;

		if (date > 1) {
			nextStep = DateExtractionModeNextStep.link;
		} else {
			nextStep = DateExtractionModeNextStep.done;
		}
		return { mode, nextStep, helpText };
	}

	return { mode, nextStep, helpText };
}

export function HeuristicDateExtraction(props: IProps) {
	const { mode, nextStep, helpText } = determineDateExtractionMode(props.columnMetadata);

	let main = <></>;

	if (
		nextStep == DateExtractionModeNextStep.offset ||
		nextStep == DateExtractionModeNextStep.linkAndOffset ||
		nextStep == DateExtractionModeNextStep.done || // Offer offset even if state is done to allow further configuration
		nextStep == DateExtractionModeNextStep.error
	) {
		// Show the date picker for the offset if there is only one time column selected
		if (props.selectedColumns.length == 1) {
			const headerName = props.headers[props.selectedColumns[0]];
			const column: IColumnConfig | undefined = props.columnMetadata[headerName];

			if (column !== undefined && column.type == "time") {
				main = (
					<EuiFormRow label={<>Start Date for Column {column.title}</>}>
						<DatePickerClearable
							value={
								column.startDate !== undefined
									? timezoneDateToLocalDate(new Date(column.startDate), column.timezone)
									: undefined
							}
							onChange={(date) => {
								assert(column?.type == "time");

								// Unlink the column if it was linked
								const partnerId = column.partnerColumnId;
								if (partnerId) {
									const partnerColumn = props.columnMetadata[partnerId];
									if (partnerColumn !== undefined) {
										assert(partnerColumn.type == "date");
										props.columnMetadata[partnerId] = {
											...partnerColumn,
											partnerColumnId: undefined,
										};
									}
								}
								column.partnerColumnId = undefined;

								// Set the offset
								column.startDate = date
									? localDateToTimezoneDate(date, column.timezone).getTime()
									: undefined;
								props.columnMetadata[headerName] = column;
								props.setConfig(props.columnMetadata);
							}}
							showTimeSelect={false}
						/>
					</EuiFormRow>
				);
			}
		}
	}

	if (
		nextStep == DateExtractionModeNextStep.link ||
		nextStep == DateExtractionModeNextStep.linkAndOffset ||
		nextStep == DateExtractionModeNextStep.done || // Offer offset even if state is done to allow further configuration
		nextStep == DateExtractionModeNextStep.error
	) {
		if (props.selectedColumns.length == 2) {
			const c1header = props.headers[props.selectedColumns[0]];
			const c2header = props.headers[props.selectedColumns[1]];
			const c1: IColumnConfig | undefined = props.columnMetadata[c1header];
			const c2: IColumnConfig | undefined = props.columnMetadata[c2header];

			if ((c1.type == "date" && c2.type == "time") || (c2.type == "date" && c1.type == "time")) {
				const onLink = () => {
					if (c1 !== undefined && c2 !== undefined) {
						c1.partnerColumnId = c2.columnId;
						c2.partnerColumnId = c1.columnId;
						if (c1.type === "time") {
							c1.startDate = undefined;
						} else if (c2.type === "time") {
							c2.startDate = undefined;
						}

						props.columnMetadata[c1header] = c1;
						props.columnMetadata[c2header] = c2;

						props.setConfig(props.columnMetadata);
					}
				};

				main = (
					<EuiButton onClick={onLink}>
						Combine {c1.columnId} and {c2.columnId}
					</EuiButton>
				);
			}
		}
	}

	if (mode === DateExtractionModes.manual) {
		main = <ManualDateExtraction state={props.manualDateExtraction} />;
	}

	return (
		<>
			{nextStep === DateExtractionModeNextStep.done && (
				// Note: We should not skip the next step automatically in case the user wants to
				// change the existing valid configuration
				<>
					<EuiCallOut title={"Date and time information found"}>
						The entered information appears valid. Continue with the{" "}
						<EuiLink onClick={props.skipToNextStep}>next step</EuiLink>.
					</EuiCallOut>
					<EuiSpacer />
				</>
			)}
			{nextStep !== DateExtractionModeNextStep.done && (
				<>
					<EuiCallOut title={"Additional actions required"} color={"warning"}>
						{helpText}
					</EuiCallOut>
					<EuiSpacer />
				</>
			)}
			{main}
		</>
	);
}
