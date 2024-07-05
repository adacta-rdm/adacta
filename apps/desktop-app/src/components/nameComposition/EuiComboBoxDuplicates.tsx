import type { EuiComboBoxOptionOption, EuiComboBoxProps, IconType } from "@elastic/eui";
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiIcon } from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import React from "react";

import { uuid } from "~/lib/uuid";

// Use EuiComboBoxProps and make the options non-nullable
// Note: This component uses a lot of assertions because the EUI types are not very precise.
type EuiComboBoxPropsWithOptions<T> = EuiComboBoxProps<T> & {
	options: Array<EuiComboBoxOptionOption<T>>;
	selectedOptions: Array<EuiComboBoxOptionOption<T>>;
};

export function EuiComboBoxDuplicates(props: EuiComboBoxPropsWithOptions<string>) {
	const [options, uuidTorRealId, realIdToUuid] = euiComboBoxOptionOptionDuplicationHelper(
		props.options,
		props.selectedOptions.map((option) => {
			assertDefined(option.value);
			return option.value;
		})
	);
	const onChange = (selectedOptions: EuiComboBoxOptionOption<string>[]) => {
		if (props.onChange) {
			const selectedOptionsRestored = selectedOptions.map((option) => {
				assertDefined(option.value);
				const restored = uuidTorRealId.get(option.value);
				return { ...option, value: restored, key: restored };
			});
			props.onChange(selectedOptionsRestored);
		}
	};

	const selectedOptions = processSelectedOptions(props.selectedOptions, realIdToUuid, onChange);

	return (
		<EuiComboBox
			{...props}
			options={options}
			selectedOptions={selectedOptions}
			onChange={onChange}
		/>
	);
}

/**
 * Helper function which replaces all values/keys with unique values/keys and returns a map to
 * restore the original values/keys. This is necessary because EuiComboBox does not allow duplicate
 * entries.
 */
function euiComboBoxOptionOptionDuplicationHelper(
	options: EuiComboBoxOptionOption<string>[],
	selectedIds: string[]
): [EuiComboBoxOptionOption<string>[], Map<string, string>, Map<string, string[]>] {
	const map = new Map<string, string>();
	const reverseMap = new Map<string, string[]>();

	const elements = options.flatMap((option) => {
		const newOption = option;

		// Recursively call this function to replace all values/keys on child options
		if (option.options) {
			const o = euiComboBoxOptionOptionDuplicationHelper(option.options, selectedIds);

			newOption.options = o[0];
			for (const [x, y] of o[1].entries()) {
				map.set(x, y);
			}
			for (const [x, y] of o[2].entries()) {
				reverseMap.set(x, y);
			}
		}

		const getInternalId = (option: EuiComboBoxOptionOption<string>) => {
			const value = option.value;
			assertDefined(value);
			const internalId = uuid();
			map.set(internalId, value);
			const reverseMapArray = reverseMap.get(value) ?? [];
			reverseMapArray.push(internalId);
			reverseMap.set(value, reverseMapArray);
			return internalId;
		};

		// Replace value/key with a unique value/key
		if (newOption.value) {
			const internalId = getInternalId(newOption);

			const opt = { ...newOption, key: internalId, value: internalId };

			// If the value is already selected, we need to add a duplicate entry to the list of
			// options. This allows the user to select the same value multiple times. Otherwise
			// the option would only be offered once.
			const dupeCount = selectedIds.filter((s) => newOption.value == s).length;
			if (dupeCount > 0) {
				const stack = [opt];
				for (let i = 0; i < dupeCount; i++) {
					const internalIdAdditionalEntry = getInternalId(newOption);
					stack.push({
						...newOption,
						key: internalIdAdditionalEntry,
						value: internalIdAdditionalEntry,
					});
				}

				return stack;
			} else {
				return [opt];
			}
		}

		return newOption;
	});

	return [elements, map, reverseMap];
}

/**
 * Helper function that maps the original values/keys to the internally used UUIDs.
 */
function processSelectedOptions(
	o: Array<EuiComboBoxOptionOption<string>>,
	realIdToUuid: Map<string, string[]>,
	orderChangeFn: (selectedOptions: EuiComboBoxOptionOption<string>[]) => void
) {
	// Since the  options are using UUIDs as values now, we need to map the selected options to the
	// correct UUIDs. Since the same value can be used multiple times, we need to keep track of the
	// index to map each occurrence of a value to a different UUID.
	const valueCounter = new Map<string, number>();

	function getUuidIndex(value: string) {
		const count = valueCounter.get(value) ?? 0;
		valueCounter.set(value, count + 1);
		return count;
	}

	function swapOrder(indexA: number, indexB: number) {
		const arrayWithSwappedOrder = [...processedOptions];
		const temp = arrayWithSwappedOrder[indexA];
		arrayWithSwappedOrder[indexA] = arrayWithSwappedOrder[indexB];
		arrayWithSwappedOrder[indexB] = temp;
		return arrayWithSwappedOrder;
	}

	const processedOptions = o.map((selectedOption, innerIndex) => {
		assertDefined(selectedOption.value);
		const index = getUuidIndex(selectedOption.value);
		const values = realIdToUuid.get(selectedOption.value);
		assertDefined(values);
		return {
			...selectedOption,
			append: (
				// The following arrows use EuiIcon instead of EuiButtonIcon because
				<EuiFlexGroup
					gutterSize={"s"}
					onClick={(e) => {
						e.stopPropagation();
					}}
				>
					<EuiFlexItem grow={false}>
						<ChangeOrderButton
							title={"Move to the left"}
							onClick={() => {
								if (innerIndex > 0) {
									orderChangeFn(swapOrder(innerIndex, innerIndex - 1));
								}
							}}
							icon={"sortLeft"}
							color={selectedOption.color}
						/>
					</EuiFlexItem>
					<EuiFlexItem grow={false}>
						<ChangeOrderButton
							title={"Move to the right"}
							onClick={() => {
								if (innerIndex < processedOptions.length - 1) {
									orderChangeFn(swapOrder(innerIndex, innerIndex + 1));
								}
							}}
							icon={"sortRight"}
							color={selectedOption.color}
						/>
					</EuiFlexItem>
				</EuiFlexGroup>
			),
			value: values[index],
			key: values[index],
		};
	});

	return processedOptions;
}

function ChangeOrderButton(props: {
	icon: IconType;
	title: string;
	onClick: () => void;
	color?: string;
}) {
	return (
		<EuiIcon
			size={"s"}
			onClick={props.onClick}
			type={props.icon}
			style={{ cursor: "pointer" }}
			title={props.title}
		/>
	);
}
