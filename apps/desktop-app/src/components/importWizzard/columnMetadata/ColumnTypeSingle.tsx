import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSuperSelect } from "@elastic/eui";
import React from "react";

import { getDefaultColumnConfig } from "./utils/getDefaultColumnConfig";
import { isTimeColumn } from "../../../utils/isTimeColumn";
import { ImportTimeConfig } from "../date/ImportTimeConfig";

import type { IColumConfigWithoutIdAndName } from "~/lib/importWizard/IColumnConfigWithoutId";
import { getNormalizerList } from "~/lib/importWizard/normalizer";
import type { NormalizerId } from "~/lib/importWizard/normalizer";
import type { IColumnConfig } from "~/lib/interface/IImportWizardPreset";

interface IProps {
	// TODO: Merge these?
	column?: IColumnConfig;
	columns: Record<string, IColumnConfig>;

	setColumn: (
		column: IColumConfigWithoutIdAndName,
		diff: Partial<IColumConfigWithoutIdAndName>
	) => void;

	headerRow: string[];
	dataRow: string[];

	decimalSeparator: string;
}

export function ColumnTypeSingle(props: IProps) {
	const { column, setColumn, dataRow, headerRow, columns, decimalSeparator } = props;

	return (
		<EuiFlexGroup>
			<EuiFlexItem grow={1}>
				<EuiFormRow label={"Column type"}>
					<EuiSuperSelect<IColumnConfig["type"] | "">
						options={[
							{ value: "skip", inputDisplay: "Skip" },
							{ value: "number", inputDisplay: "Number" },
							{ value: "date", inputDisplay: "Date" },
							{ value: "time", inputDisplay: "Time" },
							{ value: "datetime", inputDisplay: "Date + Time" },
							{ value: "offset", inputDisplay: "Offset based time" },
						]}
						valueOfSelected={column?.type ?? ""}
						onChange={(e) => {
							if (e !== "") {
								const config = getDefaultColumnConfig(e);
								setColumn({ ...config }, { ...config });
							}
						}}
					/>
				</EuiFormRow>
			</EuiFlexItem>
			{column && (
				<>
					{isTimeColumn(column) && (
						<ImportTimeConfig
							dataRow={dataRow}
							headerRow={headerRow}
							config={column}
							configs={columns}
							setConfig={setColumn}
							decimalSeparator={decimalSeparator}
						/>
					)}
				</>
			)}
			{column !== undefined && column?.type === "number" && (
				<EuiFlexItem grow={1}>
					<EuiFormRow
						label={"Normalizer"}
						helpText={
							"Normalizers can be used to normalize values in the table (i.e. turning '1 €' to '1' by removing the '€'-sign)"
						}
					>
						<EuiSuperSelect
							options={getNormalizerOptions()}
							valueOfSelected={column?.normalizerIds[0]}
							onChange={(e) => {
								const diff = { normalizerIds: e !== "" ? [e] : [] };
								setColumn({ ...column, ...diff }, diff);
							}}
						/>
					</EuiFormRow>
				</EuiFlexItem>
			)}
		</EuiFlexGroup>
	);
}

const getNormalizerOptions = () => {
	const options: { inputDisplay: string; value: "" | NormalizerId }[] = getNormalizerList().map(
		({ id, name }) => ({
			value: id,
			inputDisplay: name,
		})
	);
	options.unshift({ value: "" as const, inputDisplay: "None" });
	return options;
};
