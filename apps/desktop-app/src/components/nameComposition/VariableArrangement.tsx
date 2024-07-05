import type { EuiComboBoxOptionOption } from "@elastic/eui";
import {
	EuiBadge,
	EuiBadgeGroup,
	EuiButtonIcon,
	EuiFlexGroup,
	EuiFlexItem,
	useEuiTheme,
} from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import React, { useState } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";
import type { Opaque } from "type-fest";

import { EuiComboBoxDuplicates } from "./EuiComboBoxDuplicates";

import type { VariableArrangement$key } from "@/relay/VariableArrangement.graphql";
import type { VariableArrangementAvailableVariables$key } from "@/relay/VariableArrangementAvailableVariables.graphql";
import type { INameCompositionVariableId } from "~/lib/database/Ids";

type IndexMarker = Opaque<string, "LegacyNameId">;
export const LegacyNameId = "LEGACY" as IndexMarker;
export const ShortIdId = "SHORT_ID" as IndexMarker;
type TVariableList = (INameCompositionVariableId | IndexMarker)[];

export function VariableArrangement(props: {
	availableVariables: VariableArrangementAvailableVariables$key;
	data: VariableArrangement$key;
	/**
	 * Callback to update the order of variables and to delete variables
	 */
	updateVariables: (newVars: TVariableList, removedVar?: string) => void;
}) {
	const { euiTheme } = useEuiTheme();
	const colorVariables = euiTheme.colors.highlight;
	const colorConstants = euiTheme.colors.subduedText;

	const [editMode, setEditMode] = useState(false);

	const data = useFragment(
		graphql`
			fragment VariableArrangement on NameComposition {
				legacyNameIndex
				shortIdIndex
				variables {
					edges {
						node {
							__typename
							id
							name
						}
					}
				}
			}
		`,
		props.data
	);

	const availableVariables = useFragment(
		graphql`
			fragment VariableArrangementAvailableVariables on NameCompositionQuery {
				variables {
					edges {
						node {
							__typename
							id
							name
						}
					}
				}
			}
		`,
		props.availableVariables
	);

	const variableList = data.variables.edges.map((e) => e.node);

	const nodes = availableVariables.variables.edges.map((e) => e.node);
	const variables = nodes.filter((n) => n.__typename === "NameCompositionVariableVariable");
	const constants = nodes.filter((n) => n.__typename === "NameCompositionVariableConstant");

	const variableGroup = {
		label: "Variables",
		options: variables.map((v) => ({ label: v.name, color: colorVariables, value: v.id })),
	};

	const constantGroup = {
		label: "Constants",
		options: constants.map((v) => ({
			label: v.name,
			color: colorConstants,
			value: v.id,
		})),
	};

	const legacyNameOptions = { label: "Name", value: LegacyNameId };
	const shortIdOption = { label: "Short ID", value: ShortIdId };
	const allOptionsStatic = [variableGroup, constantGroup, legacyNameOptions, shortIdOption];

	const combinedOptions = [...variableGroup.options, ...constantGroup.options];
	const selectedOptions: EuiComboBoxOptionOption<string>[] = variableList.map((l) => {
		const option = combinedOptions.find((o) => o.value === l.id);
		assertDefined(option);
		return option;
	});

	// Inject the legacy name and short ID into the list of selected options
	const variableListWithLegacyName: { __typename?: string; name: string }[] = [];
	const selectedOptionsFinal = [];
	// Calculate the expected size of the array by making space for the legacy name and short ID if
	// needed
	const expectedArraySize =
		(data.legacyNameIndex !== null ? 1 : 0) +
		(data.shortIdIndex !== null ? 1 : 0) +
		selectedOptions.length;
	// Keep track of the original index in the selectedOptions array
	let originalArrayIndex = 0;

	// Inject the legacy name and short ID into the list of selected options
	// NOTE: Using "splice()" to directly insert the legacy name and short ID into the array caused
	// issues when the target index is larger than the array size + 1
	for (let i = 0; i < expectedArraySize; i++) {
		if (i === data.legacyNameIndex) {
			selectedOptionsFinal.push(legacyNameOptions);
			variableListWithLegacyName.push({ name: "Name" });
		} else if (i === data.shortIdIndex) {
			selectedOptionsFinal.push(shortIdOption);
			variableListWithLegacyName.push({ name: "Short ID" });
		} else {
			selectedOptionsFinal.push(selectedOptions[originalArrayIndex]);
			variableListWithLegacyName.push(variableList[originalArrayIndex]);
			originalArrayIndex++;
		}
	}

	const mainElement = !editMode ? (
		<EuiBadgeGroup>
			{variableListWithLegacyName.map((l, index) => (
				<EuiBadge
					key={`${index}${l.name}`}
					color={
						l.__typename === "NameCompositionVariableConstant"
							? colorConstants
							: l.__typename == "NameCompositionVariableVariable"
							? colorVariables
							: undefined
					}
				>
					{l.name}
				</EuiBadge>
			))}
		</EuiBadgeGroup>
	) : (
		<EuiComboBoxDuplicates
			fullWidth={true}
			options={allOptionsStatic}
			selectedOptions={selectedOptionsFinal}
			onChange={(o) => {
				const ids = o.map((option) => {
					assertDefined(option.value);
					return option.value;
				});

				props.updateVariables(ids as TVariableList);
			}}
		/>
	);

	return (
		<EuiFlexGroup
			alignItems={"center"}
			direction={"row"}
			style={{
				height: 40, // Height when the EuiComboBoxDuplicates is shown
			}}
		>
			<EuiFlexItem>{mainElement}</EuiFlexItem>
			<EuiFlexItem grow={false}>
				<EuiButtonIcon
					iconType={editMode ? "check" : "pencil"}
					onClick={() => setEditMode(!editMode)}
				/>
			</EuiFlexItem>
		</EuiFlexGroup>
	);
}
