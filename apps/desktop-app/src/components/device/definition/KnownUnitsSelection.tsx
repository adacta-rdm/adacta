import { EuiComboBox } from "@elastic/eui";
import { Qty } from "@omegadot/einheiten";
import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";
import React, { useState } from "react";

export function KnownUnitsSelection(props: {
	value: UnitKind[];
	isDisabled: boolean;
	onChange: (unitKinds: UnitKind[]) => void;
	fullWidth?: boolean;
}) {
	const possibleUnits = Qty.getKinds();

	const optionsStatic = possibleUnits.map((kind) => ({ label: kind }));

	const [selectedOptions, setSelected] = useState<{ label: UnitKind }[]>(
		props.value.length > 0 ? props.value.map((v) => ({ label: v })) : []
	);

	return (
		<EuiComboBox
			fullWidth={props.fullWidth}
			isDisabled={props.isDisabled}
			placeholder="Select units this device can record"
			options={optionsStatic}
			selectedOptions={selectedOptions}
			onChange={(e) => {
				const value = e as { label: UnitKind }[];
				setSelected(value);
				props.onChange(value.map((v) => v.label));
			}}
			isClearable={true}
		/>
	);
}
