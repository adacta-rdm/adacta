import assert from "assert";

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from "@elastic/eui";
import React from "react";

import { renderPreview } from "./utils/renderPreview";
import { DatePicker } from "../../../datepicker/DatePicker";

import {
	localDateToTimezoneDate,
	timezoneDateToLocalDate,
} from "~/lib/datetime/TimezoneConversion";
import type { IColumnTimeConfig } from "~/lib/interface/IImportWizardPreset";

interface IProps {
	dataRow: string[];
	headerRow: string[];

	config: IColumnTimeConfig;
	setConfig: (config: IColumnTimeConfig, diff: Partial<IColumnTimeConfig>) => void;

	decimalSeparator: string;
}

const labelToTimes = {
	Millisecond: 1,
	Second: 1000,
	Minute: 1000 * 60,
	Hour: 1000 * 60 * 60,
};

export function DateOffsetConfig({
	config,
	setConfig,
	dataRow,
	headerRow,
	decimalSeparator,
}: IProps) {
	assert(config.type === "offset");
	const { startDate, conversionFactor } = config;

	const setStartDate = (date: Date) => {
		const diff = { startDate: date?.getTime() ?? new Date().getTime() };
		setConfig({ ...config, ...diff }, diff);
	};

	const setConversionFactor = (c: number) => {
		const diff = { conversionFactor: c };
		setConfig({ ...config, ...diff }, diff);
	};

	return (
		<>
			<EuiFlexGroup>
				<EuiFlexItem grow={true}>
					<EuiFormRow display="rowCompressed" label={"Unit of the offset"}>
						<EuiSelect
							options={Object.entries(labelToTimes).map(([text, value]) => ({ text, value }))}
							value={conversionFactor}
							onChange={(e) => {
								const integer = parseInt(e.target.value);
								if (!isNaN(integer)) {
									setConversionFactor(integer);
								}
							}}
						/>
					</EuiFormRow>
				</EuiFlexItem>
				<EuiFlexItem grow={true}>
					<EuiFormRow display="rowCompressed" label="Start date" fullWidth={true}>
						<DatePicker
							value={timezoneDateToLocalDate(new Date(startDate), config.timezone)}
							onChange={(e) => setStartDate(localDateToTimezoneDate(e, config.timezone))}
							fullWidth={true}
						/>
					</EuiFormRow>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiFlexItem grow={true}>
				<EuiFormRow label="Preview (Local time)">
					<>{renderPreview(dataRow, headerRow, config, { decimalSeparator })}</>
				</EuiFormRow>
			</EuiFlexItem>
		</>
	);
}
