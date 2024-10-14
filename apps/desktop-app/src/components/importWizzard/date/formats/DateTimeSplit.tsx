import assert from "assert";

import { EuiFieldText, EuiFlexItem, EuiFormRow } from "@elastic/eui";
import React from "react";

import { renderPreview } from "./utils/renderPreview";
import { useDebounceFormUpdate } from "../../../utils/useDebouncedFormUpdate";

import { assertUnreachable } from "~/lib/assert/assertUnreachable";
import type {
	IColumnConfig,
	IColumnTimeConfig,
	IColumnTypeDate,
	IColumnTypeTime,
} from "~/lib/interface/IImportWizardPreset";

interface IProps {
	dataRow: string[];
	headerRow: string[];

	config: IColumnTimeConfig;
	configs: Record<string, IColumnConfig>;
	setConfig: (config: IColumnTimeConfig, diff: Partial<IColumnTimeConfig>) => void;
}

const getOppositeType = (
	type: IColumnTypeTime["type"] | IColumnTypeDate["type"]
): "time" | "date" => {
	switch (type) {
		case "time":
			return "date";
		case "date":
			return "time";
		default:
			assertUnreachable(type);
	}
};

export function DateTimeSplit({ dataRow, headerRow, config, configs, setConfig }: IProps) {
	assert(config.type === "time" || config.type === "date");

	const [format, setDateFormat] = useDebounceFormUpdate(
		config.format,
		(f: string) => {
			const diff = { format: f };
			setConfig({ ...config, ...diff }, diff);
		},
		500
	);

	const targetFormat = config.type === "time" ? "HH:mm:ss" : "DD.MM.YYYY";

	const configsArray = configs !== undefined ? Object.values(configs) : [];
	const possiblePartners = configsArray
		.filter(
			(c) =>
				c.type === getOppositeType(config.type) &&
				(c.partnerColumnId === undefined || c.partnerColumnId === config.columnId)
		)
		.map((c) => ({ value: c.columnId, text: c.columnId }));
	possiblePartners.unshift({ text: "No partner", value: "" });

	return (
		<>
			<EuiFlexItem grow={false}>
				<EuiFormRow display="rowCompressed" label="Format">
					<EuiFieldText value={format} onChange={(e) => setDateFormat(e.target.value)} />
				</EuiFormRow>
				<EuiFormRow label="Preview">
					<>{renderPreview(dataRow, headerRow, config, { targetFormat })}</>
				</EuiFormRow>
			</EuiFlexItem>
		</>
	);
}
