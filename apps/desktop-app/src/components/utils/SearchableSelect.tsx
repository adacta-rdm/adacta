import type { EuiComboBoxOptionOption } from "@elastic/eui";
import { EuiComboBox } from "@elastic/eui";
import type { ReactNode } from "react";
import React from "react";

import { assertDefined } from "~/lib/assert/assertDefined";

// Zero Width Space
const ZERO_WIDTH_SPACE = "\u200b";

interface IProps<TValue> {
	options: {
		label: string;
		value?: TValue;
	}[];

	value: TValue | undefined;

	onChangeValue: (value: TValue | undefined) => void;
	onCreateOption?: (value: string) => void;

	placeholder?: string;

	renderOption?: (
		option: EuiComboBoxOptionOption<TValue>,
		searchValue: string,
		OPTION_CONTENT_CLASSNAME: string
	) => ReactNode;

	fullWidth?: boolean;
	isLoading?: boolean;

	rowHeight?: number;
}

export function SearchableSelectLoading<TValue>(
	props: Omit<IProps<TValue>, "value" | "options" | "onChangeValue" | "isLoading" | "renderOption">
) {
	return (
		<EuiComboBox
			fullWidth={props.fullWidth}
			placeholder={props.placeholder ?? "Select an option"}
			singleSelection={{ asPlainText: true }}
			rowHeight={props.rowHeight}
			isClearable={false}
			// Loading state
			isLoading={true}
			isDisabled={true}
		/>
	);
}

/**
 * A select form element with included search.
 * This component wraps EuiComboBox (which usually allows multiple elements being selected at the
 * same time) and exposes simplified props similar to a EuiSelect
 */
export function SearchableSelect<TValue>(props: IProps<TValue>) {
	// Ugly Hack: This component places checkmarks in the dropdown next to the currently selected
	// option. The checkmark is placed to all options with the same label(!) as the selected option
	// Since this component is used with user provided data there are cases where there are two
	// different options with the same label (i.e. two different device types named "MFC").
	// To avoid this every option gets a unique label by adding "zero width spaces" at the end
	const options = props.options.map((o, i) => ({
		...o,
		value: o.value,
		label: `${o.label}${ZERO_WIDTH_SPACE.repeat(i)}`,
	}));

	const selectedOption = options.find((o) => o.value === props.value);

	return (
		<EuiComboBox<TValue>
			fullWidth={props.fullWidth}
			placeholder={props.placeholder ?? "Select an option"}
			singleSelection={{ asPlainText: true }}
			options={options}
			rowHeight={props.rowHeight}
			selectedOptions={
				props.value !== undefined && selectedOption !== undefined ? [selectedOption] : []
			}
			onChange={(v) => props.onChangeValue(v[0]?.value)}
			onCreateOption={props.onCreateOption}
			renderOption={
				props.renderOption
					? (option, searchValue, OPTION_CONTENT_CLASSNAME) => {
							assertDefined(props.renderOption);
							if (option.value === undefined) {
								return props.placeholder;
							}

							return props.renderOption(option, searchValue, OPTION_CONTENT_CLASSNAME);
					  }
					: undefined
			}
			isLoading={props.isLoading}
			isClearable={false}
			sortMatchesBy="startsWith" // Prioritize options that start with the search string
		/>
	);
}

interface IPropsSuperSelect<TValue> extends IProps<TValue> {
	options: {
		label: string;
		value?: TValue;
		inputDisplay: ReactNode;
	}[];
}

/**
 * Helper component which supports the "options" structure of EuiSuperSelect where the rendered
 * version of the option is saved in the "inputDisplay" property
 */
export function SearchableSuperSelect<TValue extends string | number | symbol>(
	props: IPropsSuperSelect<TValue>
) {
	const mapValueToReactNode: Record<TValue | any, ReactNode> = {};

	for (const option of props.options) {
		mapValueToReactNode[option.value] = option.inputDisplay;
	}

	return (
		<SearchableSelect
			{...props}
			options={props.options.map((o) => {
				const obj = { ...o };
				delete obj.inputDisplay;
				return obj;
			})}
			renderOption={(option) => {
				if (option.value !== undefined) {
					return mapValueToReactNode[option.value];
				}
				return <></>;
			}}
		/>
	);
}
