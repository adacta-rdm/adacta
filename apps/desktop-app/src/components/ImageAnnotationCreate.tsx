import { EuiButtonIcon, EuiComboBox } from "@elastic/eui";
import React, { useState } from "react";

interface IProps {
	x: number;
	y: number;
	options: { text: string; value: string }[];
	onSave: (value: string, x: number, y: number) => void;
	onCancel: () => void;
}

export function ImageAnnotationCreate(props: IProps) {
	const { x, y } = props;
	const options = props.options.map((o) => ({ label: o.text, value: o.value }));

	const [value, setValue] = useState(options[0].value);

	return (
		<EuiComboBox
			singleSelection={{ asPlainText: true }}
			options={options}
			selectedOptions={options.filter((o) => o.value === value)}
			isClearable={false}
			onChange={(option) => {
				if (option[0].value) {
					setValue(option[0].value);
				}
			}}
			append={
				<div style={{ height: "100%" }}>
					<EuiButtonIcon
						iconType="save"
						onClick={() => props.onSave(value, x, y)}
						aria-label="Save label"
					/>
					<EuiButtonIcon
						iconType="cross"
						onClick={() => props.onCancel()}
						aria-label="Abort label creation"
					/>
				</div>
			}
		/>
	);
}
