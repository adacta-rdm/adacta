import assert from "assert";

import { EuiFieldText, EuiFlexItem, EuiFormRow } from "@elastic/eui";
import React from "react";

import { renderPreview } from "./utils/renderPreview";
import { useDebounceFormUpdate } from "../../../utils/useDebouncedFormUpdate";

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
				<EuiFieldText value={format} onChange={(e) => setFormat(e.target.value)} />
			</EuiFormRow>
			<EuiFormRow label="Preview">
				<>{renderPreview(dataRow, headerRow, config, {})}</>
			</EuiFormRow>
		</EuiFlexItem>
	);
}
