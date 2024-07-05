import type { EuiComboBoxOptionOption } from "@elastic/eui";
import { EuiComboBox, EuiFlexGroup, EuiFlexItem } from "@elastic/eui";
import React, { useState } from "react";

import { propertyNameToReadableString } from "../../utils/PropertyNameToReadableString";
import { getTokenByType } from "../../utils/getTokenByType";

import type { IPropertyDefinition } from "~/lib/interface/IPropertyDefinition";

export function SlotSelection(props: {
	propertyDefinitions: Readonly<IPropertyDefinition[]>;
	value: string;
	onChange: (value: string) => void;

	// We need to know if we are editing or creating a property as this changes what happens if a
	// custom slot is entered (new property = new slot, existing property = change of slot name)
	editMode?: boolean;
}) {
	interface IOptionType {
		propertyType: string;
	}

	const options: EuiComboBoxOptionOption<IOptionType>[] = props.propertyDefinitions
		// Remove undefined entries which can occur while mutation is in flight
		.filter((p) => p.type !== undefined && p.name !== undefined)
		.map((p) => ({
			label: p.name,
			value: { propertyType: p.type },
		}));

	// Make sure that newly created slots are added to the list of options. Otherwise, the selection
	// will get lost on re-renders as the option won't become part of `initialSelection`
	if (props.value !== "" && options.filter((o) => o.label === props.value).length === 0) {
		options.push({ label: props.value, value: { propertyType: "NewProperty" } });
	}

	const initialSelection = props.value === "" ? [] : options.filter((o) => o.label === props.value);
	const [selectedOptions, setSelected] = useState<{ label: string }[]>(initialSelection);

	const onCreateOption = (searchValue: string) => {
		const normalizedSearchValue = searchValue.trim();

		if (!normalizedSearchValue) {
			return;
		}

		const newOption = {
			label: normalizedSearchValue,
		};

		// Select the option.
		setSelected([newOption]);
		props.onChange(newOption.label);
	};

	return (
		<EuiComboBox
			fullWidth
			placeholder="Select a slot"
			singleSelection={{ asPlainText: true }}
			options={options}
			selectedOptions={selectedOptions}
			onChange={(e) => {
				setSelected(e);
				props.onChange(e[0]?.label ?? "");
			}}
			onCreateOption={onCreateOption}
			renderOption={(option: EuiComboBoxOptionOption<IOptionType>) => {
				if (option.value === undefined) {
					return null;
				}

				return (
					<EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
						<EuiFlexItem grow={false}>{propertyNameToReadableString(option.label)}</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiFlexGroup alignItems="center" gutterSize="s">
								<EuiFlexItem grow={false}>
									Allowed component type: {option.value.propertyType}
								</EuiFlexItem>
								<EuiFlexItem grow={false}>
									{option.value.propertyType === "NewProperty" ? (
										<></>
									) : (
										getTokenByType(option.value.propertyType)
									)}
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				);
			}}
			customOptionText={
				props.editMode
					? "Change existing slot name to {searchValue}"
					: "Add {searchValue} as a new slot"
			}
		/>
	);
}
