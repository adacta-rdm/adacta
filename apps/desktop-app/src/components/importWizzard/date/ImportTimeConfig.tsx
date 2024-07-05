import { EuiFlexItem, EuiFormRow } from "@elastic/eui";
import React from "react";

import { TimezoneSelection } from "./TimezoneSelection";
import { DateOffsetConfig } from "./formats/DateOffsetConfig";
import { DateTimeCombined } from "./formats/DateTimeCombined";
import { DateTimeSplit } from "./formats/DateTimeSplit";

import type { IColumnConfig, IColumnTimeConfig } from "~/lib/interface/IImportWizardPreset";

interface IProps {
	dataRow: string[];
	headerRow: string[];

	// TODO: Merge these?
	config: IColumnTimeConfig;
	configs: Record<string, IColumnConfig>;

	setConfig: (config: IColumnTimeConfig, diff: Partial<IColumnTimeConfig>) => void;

	decimalSeparator: string;
}

export function ImportTimeConfig(props: IProps) {
	const { config, setConfig } = props;

	return (
		<>
			{config.type === "offset" && (
				<EuiFlexItem grow={2}>
					<EuiFormRow display="rowCompressed" fullWidth={true}>
						<DateOffsetConfig
							dataRow={props.dataRow}
							headerRow={props.headerRow}
							config={config}
							setConfig={setConfig}
							decimalSeparator={props.decimalSeparator}
						/>
					</EuiFormRow>
				</EuiFlexItem>
			)}
			{(config.type === "time" || config.type === "date") && (
				<EuiFlexItem grow={2}>
					<EuiFormRow display="rowCompressed">
						<DateTimeSplit
							dataRow={props.dataRow}
							headerRow={props.headerRow}
							config={props.config}
							configs={props.configs}
							setConfig={setConfig}
						/>
					</EuiFormRow>
				</EuiFlexItem>
			)}
			{config.type === "datetime" && (
				<EuiFlexItem grow={2}>
					<EuiFormRow display="rowCompressed">
						<DateTimeCombined
							dataRow={props.dataRow}
							headerRow={props.headerRow}
							config={config}
							setConfig={setConfig}
						/>
					</EuiFormRow>
				</EuiFlexItem>
			)}
			<EuiFlexItem grow={1}>
				<EuiFormRow
					display="rowCompressed"
					label={"Timezone"}
					helpText={
						"Select the timezone which was used when the times where written to the file. If the time column is an offset select the timezone the starting time should be interpreted"
					}
				>
					<TimezoneSelection
						timezone={config.timezone}
						setTimezone={(timezone) => {
							const diff = { timezone };
							setConfig({ ...config, ...diff }, diff);
						}}
					/>
				</EuiFormRow>
			</EuiFlexItem>
		</>
	);
}
