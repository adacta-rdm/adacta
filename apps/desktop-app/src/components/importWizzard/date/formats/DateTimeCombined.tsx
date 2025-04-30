import assert from "assert";

import { EuiFlexItem, EuiFormRow } from "@elastic/eui";
import React from "react";

import { renderPreview } from "./utils/renderPreview";
import { useDebounceFormUpdate } from "../../../utils/useDebouncedFormUpdate";

import { DateFormatStringInput } from "~/apps/desktop-app/src/components/importWizzard/date/formats/DateFormatStringInput";
import type { IColumnTimeConfig } from "~/lib/interface/IImportWizardPreset";

interface IProps {
	dataRow: string[];
	headerRow: string[];

	config: IColumnTimeConfig;
	setConfig: (config: IColumnTimeConfig, diff: Partial<IColumnTimeConfig>) => void;
}

export function DateTimeCombined({ dataRow, headerRow, config, setConfig }: IProps) {
	assert(config.type === "datetime");

	const [format, setFormat] = useDebounceFormUpdate(
		config.format,
		(f: string) => {
			const diff = { format: f };
			setConfig({ ...config, ...diff }, diff);
		},
		750
	);

	return (
		<EuiFlexItem grow={true}>
			<EuiFormRow display="rowCompressed" label="Format">
				<DateFormatStringInput value={format} onChange={setFormat} inputMode={"combined"} />
			</EuiFormRow>
			<EuiFormRow label="Preview">
				<>{renderPreview(dataRow, headerRow, config, {})}</>
			</EuiFormRow>
		</EuiFlexItem>
	);
}
