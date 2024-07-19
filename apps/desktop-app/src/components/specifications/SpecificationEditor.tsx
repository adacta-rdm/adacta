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
	EuiSpacer,
	EuiText,
} from "@elastic/eui";
import { EuiTextArea } from "@elastic/eui";
import type { EuiDescriptionListProps } from "@elastic/eui/src/components/description_list/description_list_types";
import { assertDefined } from "@omegadot/assert";
import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { ArrayElement } from "type-fest/source/internal";

import { useDeviceSpecificationKeys, useSampleSpecificationKeys } from "./SpecificationKeyProvider";

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
						<EuiFlexGroup>
							<EuiFlexItem>
								{editKey.label !== "Description" ? (
									<EuiFieldText
										value={editValue}
										autoFocus={true}
										onChange={(e) => setEditValue(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												updateSpecification();
											}
										}}
										maxLength={2000}
									/>
								) : (
									<EuiTextArea
										value={editValue}
										autoFocus={true}
										onChange={(e) => setEditValue(e.target.value)}
										maxLength={2000}
									/>
								)}
								{editValue.length === MAX_SPECIFICATION_VALUE_LENGTH && (
									<>
										<EuiSpacer />
										<EuiCallOut color={"warning"}>
											Specification values can only contain {MAX_SPECIFICATION_VALUE_LENGTH}{" "}
											characters.
										</EuiCallOut>
									</>
								)}
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiButtonIcon iconType="save" aria-label="Save" onClick={updateSpecification} />
							</EuiFlexItem>
						</EuiFlexGroup>
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
					<>
						<EuiFlexGroup alignItems="center" direction="row">
							<EuiFieldText
								onChange={(e) => setEditValue(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										saveNewSpecification();
									}
								}}
							/>

							<EuiFlexItem grow={false}>
								<EuiButtonIcon
									iconType="save"
									aria-label="Save"
									disabled={editKey === undefined || customKeyInvalid}
									onClick={saveNewSpecification}
								/>
							</EuiFlexItem>
							<EuiFlexItem grow={false}>
								<EuiButtonIcon
									iconType="cross"
									aria-label="Delete"
									disabled={editKey === undefined || customKeyInvalid}
									onClick={() => {
										setEditKey(undefined);
										setEditMode(false);
									}}
								/>
							</EuiFlexItem>
						</EuiFlexGroup>
					</>
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
