import {
	EuiButton,
	EuiButtonEmpty,
	EuiButtonIcon,
	EuiCallOut,
	EuiComboBox,
	EuiDescriptionList,
	EuiEmptyPrompt,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiSpacer,
	EuiText,
} from "@elastic/eui";
import { EuiTextArea } from "@elastic/eui";
import type { EuiDescriptionListProps } from "@elastic/eui/src/components/description_list/description_list_types";
import { assertDefined } from "@omegadot/assert";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { ArrayElement } from "type-fest/source/internal";

import { useDeviceSpecificationKeys, useSampleSpecificationKeys } from "./SpecificationKeyProvider";

import {
	isSpecialMeaningLabel,
	specialMeaningSpecificationsValueValidator,
} from "~/apps/desktop-app/src/components/specifications/specialMeaningSpecificationsKeys";
import { wrapWithSuspense } from "~/apps/desktop-app/src/utils/wrapWithSuspense";
import { MAX_SPECIFICATION_VALUE_LENGTH } from "~/lib/MAX_SPECIFICATION_VALUE_LENGTH";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

interface IProps {
	specifications: ISpecification[];
	setSpecifications: (specifications: ISpecification[]) => void;
	setUnsavedChanges?: (unsavedChanges: boolean) => void;
}

export const SpecificationEditorDevices =
	// The useDeviceSpecificationKeys() function suspends the component. Therefore, is important to
	// wrap the component with a Suspense boundary to avoid loosing state
	wrapWithSuspense(
		forwardRef<ISpecificationEditorActions, IProps>(function SpecificationEditorDevices(
			props,
			ref
		) {
			return (
				<SpecificationEditor
					{...props}
					specificationKeySuggestions={useDeviceSpecificationKeys()}
					ref={ref}
				/>
			);
		})
	);

export const SpecificationEditorSamples =
	// The useSampleSpecificationKeys() function suspends the component. Therefore, is important to
	// wrap the component with a Suspense boundary to avoid loosing state
	wrapWithSuspense(
		forwardRef<ISpecificationEditorActions, IProps>(function SpecificationEditorSamples(
			props: IProps,
			ref
		) {
			return (
				<SpecificationEditor
					{...props}
					specificationKeySuggestions={useSampleSpecificationKeys()}
					ref={ref}
				/>
			);
		})
	);

export interface ISpecificationEditorActions {
	addSpecification: (name: string, value: string) => void;
}

function SpecificationValue(props: {
	specificationKey?: string;
	specificationValue: string;
	setEditValue: (value: ((prevState: string) => string) | string) => void;
	saveSpecification: () => void;
	valueInvalid: boolean;
}) {
	const { specificationKey, specificationValue, setEditValue, saveSpecification, valueInvalid } =
		props;

	return (
		<>
			{specificationKey !== "Description" ? (
				<EuiFieldText
					isInvalid={valueInvalid}
					value={specificationValue}
					autoFocus={true}
					onChange={(e) => setEditValue(e.target.value)}
					onKeyDown={(e) => {
						if (!valueInvalid && e.key === "Enter") {
							saveSpecification();
						}
					}}
					maxLength={2000}
					fullWidth={true}
				/>
			) : (
				<EuiTextArea
					value={specificationValue}
					autoFocus={true}
					onChange={(e) => setEditValue(e.target.value)}
					maxLength={2000}
					fullWidth={true}
				/>
			)}
			{setEditValue.length === MAX_SPECIFICATION_VALUE_LENGTH && (
				<>
					<EuiSpacer />
					<EuiCallOut color={"warning"}>
						Specification values can only contain {MAX_SPECIFICATION_VALUE_LENGTH} characters.
					</EuiCallOut>
				</>
			)}
		</>
	);
}

function EditSpecificationValue(props: {
	specificationKey?: string;
	specificationValue: string;
	setEditValue: (value: ((prevState: string) => string) | string) => void;

	// Validation
	valueInvalid: boolean;
	keyInvalid: boolean;

	// Events
	saveSpecification: () => void;
	deleteSpecification: () => void;
}) {
	const {
		specificationKey,
		specificationValue,
		setEditValue,
		valueInvalid,
		keyInvalid,

		saveSpecification,
		deleteSpecification,
	} = props;

	return (
		<EuiFormRow
			helpText={
				isSpecialMeaningLabel(specificationKey) &&
				specialMeaningSpecificationsValueValidator[specificationKey]?.validationHint
			}
		>
			<EuiFlexGroup alignItems="center" direction="row">
				<SpecificationValue
					specificationKey={specificationKey}
					specificationValue={specificationValue}
					setEditValue={setEditValue}
					saveSpecification={saveSpecification}
					valueInvalid={valueInvalid}
				/>
				<EuiFlexItem grow={false}>
					<EuiButtonIcon
						iconType="save"
						aria-label="Save"
						disabled={keyInvalid || valueInvalid}
						onClick={saveSpecification}
					/>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<EuiButtonIcon iconType="cross" aria-label="Delete" onClick={deleteSpecification} />
				</EuiFlexItem>
			</EuiFlexGroup>
		</EuiFormRow>
	);
}

/**
 * This is the core component for editing specifications. The two wrapper components
 * SpecificationEditorDevices and SpecificationEditorSamples provide the suggestions for new
 * specification keys.
 */
const SpecificationEditor = forwardRef<
	ISpecificationEditorActions,
	IProps & { specificationKeySuggestions: string[] }
>(function SpecificationEditor(props, ref) {
	useImperativeHandle(
		ref,
		() => {
			return {
				addSpecification: (name: string, value: string) => {
					if (props.specifications.find((s) => s.name === name) == undefined) {
						props.setSpecifications([...props.specifications, { name, value }]);
						setEditValue(value);
					}
					setEditKey({ label: name });
				},
			};
		},
		[props]
	);

	// Only trigger setUnsavedChanges if editKey changes otherwise React will complain because we
	// mutate the state of the parent component while rendering
	useEffect(() => {
		if (props.setUnsavedChanges !== undefined) {
			props.setUnsavedChanges(editKey !== undefined);
		}
	});

	const existingKeys = props.specifications.map((s) => s.name);
	const options = props.specificationKeySuggestions
		.filter((s) => !existingKeys.includes(s))
		.map((s) => ({ label: s }));

	const [editMode, setEditMode] = useState(false);

	const [editKey, setEditKey] = useState<undefined | { label: string }>(undefined);
	const [editValue, setEditValue] = useState("");
	const [customKeyInvalid, setCustomKeyInvalid] = useState(false);

	const valueInvalid =
		isSpecialMeaningLabel(editKey?.label) &&
		specialMeaningSpecificationsValueValidator[editKey.label]?.validationFn?.(editValue) === false;

	const onCreateOption = (searchValue: string) => {
		const normalizedSearchValue = searchValue.trim();

		if (!normalizedSearchValue) {
			return;
		}

		const newOption = {
			label: normalizedSearchValue,
		};

		// If this key already exists accept it but mark the form invalid
		if (existingKeys.includes(normalizedSearchValue)) {
			setCustomKeyInvalid(true);
		} else {
			setCustomKeyInvalid(false);
		}
		setEditKey(newOption);
	};

	const deleteProperty = (key: string) => {
		props.setSpecifications(props.specifications.filter((s) => s.name !== key));
	};

	const saveNewSpecification = () => {
		assertDefined(editKey);
		props.setSpecifications([...props.specifications, { name: editKey.label, value: editValue }]);

		setEditKey(undefined);
		setEditValue("");
		setEditMode(false);
	};

	if (props.specifications.length == 0 && !editMode) {
		return (
			<EuiEmptyPrompt
				title={
					<h1>
						<EuiText>No specifications</EuiText>
					</h1>
				}
				body={
					<>
						Assign properties to provide more information for this item, for example manufacturer,
						model number, flow rate and range.
						<br />
						<br />
						Avoid properties than can change with time, such as calibration values or mass. Use the
						notes feature instead.
					</>
				}
				actions={
					<EuiButton color="primary" fill onClick={() => setEditMode(true)}>
						Add specifications
					</EuiButton>
				}
			/>
		);
	}

	// Create a list of all specifications with the possibility to edit them as required
	// for the DescriptionList
	const existingSpecificationsItems = [...props.specifications]
		.sort((a, b) => a.name.localeCompare(b.name))
		.map((s) => {
			const updateSpecification = () => {
				props.setSpecifications(
					props.specifications.map((specification) => {
						if (specification.name !== s.name) {
							return specification;
						}
						return { ...specification, value: editValue };
					})
				);
				setEditMode(false);
				setEditKey(undefined);
				setEditValue("");
			};

			return {
				title: s.name,
				description:
					s.name !== editKey?.label ? (
						<EuiFlexGroup>
							<EuiFlexItem>{s.value}</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiButtonIcon
									iconType="pencil"
									aria-label="Edit"
									onClick={() => {
										setEditMode(false);
										setEditKey({ label: s.name });
										setEditValue(s.value);
									}}
								/>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiButtonIcon
									iconType="cross"
									aria-label="Delete"
									onClick={() => deleteProperty(s.name)}
								/>
							</EuiFlexItem>
						</EuiFlexGroup>
					) : (
						<EditSpecificationValue
							specificationKey={editKey.label}
							specificationValue={editValue}
							setEditValue={setEditValue}
							saveSpecification={updateSpecification}
							valueInvalid={valueInvalid}
							deleteSpecification={() => {
								setEditKey(undefined);
								setEditMode(false);
								deleteProperty(editKey.label);
							}}
							// We don't allow changing the key (wen existing specifications are
							// edited) which makes it always valid
							keyInvalid={false}
						/>
					),
			};
		});

	const endOfListAction: ArrayElement<EuiDescriptionListProps["listItems"]> = editMode
		? {
				title: (
					<EuiComboBox
						placeholder="Select a single option"
						isInvalid={customKeyInvalid}
						singleSelection={{ asPlainText: true }}
						options={options}
						selectedOptions={editKey ? [editKey] : []}
						onCreateOption={onCreateOption}
						onChange={(e) => {
							setCustomKeyInvalid(false);
							setEditKey(e[0]);
						}}
					/>
				),
				description: (
					<EditSpecificationValue
						specificationKey={editKey?.label}
						specificationValue={editValue}
						setEditValue={setEditValue}
						valueInvalid={valueInvalid}
						keyInvalid={editKey === undefined || customKeyInvalid}
						saveSpecification={saveNewSpecification}
						deleteSpecification={() => {
							setEditKey(undefined);
							setEditMode(false);
						}}
					/>
				),
		  }
		: {
				title: "",
				description: !editMode && (
					<EuiButtonEmpty iconType="plus" aria-label="Add" onClick={() => setEditMode(true)}>
						Add Specification
					</EuiButtonEmpty>
				),
		  };

	return (
		<>
			<EuiDescriptionList
				type={"column"}
				columnGutterSize={"m"}
				listItems={[...existingSpecificationsItems, endOfListAction]}
				columnWidths={[1, 3]} // 1/4 width for the title, 3/4 for values + actions
			/>
		</>
	);
});
