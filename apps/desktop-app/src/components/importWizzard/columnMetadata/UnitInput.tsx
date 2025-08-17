import { EuiButtonEmpty, EuiFieldText } from "@elastic/eui";
import React, { useState } from "react";

import { getUnitKind } from "./utils/getUnitKind";
import { useDebounceFormUpdate } from "../../utils/useDebouncedFormUpdate";

import { UnitlessMarker } from "~/lib/importWizard/ImportWizardUnit";
import type { TUnit } from "~/lib/importWizard/ImportWizardUnit";

interface IProps {
	value: TUnit;

	readOnly?: boolean;
	disabled?: boolean;

	onChange: (value: TUnit) => void;

	/**
	 * Updates if the entered unit becomes valid/invalid
	 */
	onUpdateUnitValidityState?: (valid: boolean) => void;
}

export function UnitInput(props: IProps) {
	const [value, onChange] = useDebounceFormUpdate<TUnit>(
		props.value,
		(e) => {
			const value = e === "Unitless" ? UnitlessMarker : e;
			props.onChange(value);
		},
		500
	);

	const [lastReportedState, setLastReportedState] = useState(false);

	const unitKind = getUnitKind(value);

	let formattedKind = unitKind.split("_").join(" ");
	formattedKind = formattedKind.charAt(0).toUpperCase() + formattedKind.slice(1);

	if (props.onUpdateUnitValidityState) {
		const newState = unitKind !== "";

		if (newState !== lastReportedState) {
			props.onUpdateUnitValidityState(newState);
			setLastReportedState(newState);
		}
	}

	return (
		<EuiFieldText
			value={value === UnitlessMarker ? "Unitless" : value}
			onChange={(e) => onChange(e.target.value)}
			append={[
				formattedKind,
				value !== UnitlessMarker && formattedKind === "" ? (
					<EuiButtonEmpty
						size={"xs"}
						key={"markUnitless"}
						onClick={() => props.onChange(UnitlessMarker)}
					>
						Mark as unitless
					</EuiButtonEmpty>
				) : (
					<></>
				),
			]}
			readOnly={props.readOnly}
			disabled={props.disabled}
		/>
	);
}
