import assert from "assert";

import {
	EuiButton,
	EuiButtonEmpty,
	EuiCallOut,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSpacer,
	EuiSwitch,
} from "@elastic/eui";
import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";
import type { ReactElement } from "react";
import React, { useRef, useState } from "react";

import { EditDeviceDefinition } from "./EditDeviceDefinition";
import { KnownUnitsSelection } from "./KnownUnitsSelection";
import { UniqueName } from "../../UniqueName";
import type { ISpecificationEditorActions } from "../../specifications/SpecificationEditor";
import { SpecificationEditorDevices } from "../../specifications/SpecificationEditor";
import { DeviceDefinitionSelection } from "../DeviceDefinitionSelection";
import { InheritedSpecificationsDevice } from "../InheritedSpecifications";
import { UnsavedChangesModal } from "../modals/UnsavedChangesModal";

import { assertDefined } from "~/lib/assert/assertDefined";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

interface IProps {
	closeModal: () => void;
	onSubmitEdit?: (
		name: string,
		parentDeviceDefinition: IDeviceDefinitionId | undefined,
		specifications: ISpecification[],
		acceptUnits: UnitKind[]
	) => void;
	onSubmitAdd?: (
		name: string,
		parentDeviceDefinition: IDeviceDefinitionId | undefined,
		specifications: ISpecification[],
		acceptUnits: UnitKind[]
	) => void;
	onEditImages?: () => void;
	isLoading: boolean;

	initialDefinitionName?: string;
	initialSpecifications?: ISpecification[];
	initialAcceptsUnits?: UnitKind[];

	deviceDefinition?: string;
	error?: string;

	/**
	 * This component is written without (direct) GraphQL interaction. This is done to allow the
	 * same "editor" to work for existing Devices and for creating new Devices.
	 * For this reason this component can't render the list of current images itself.
	 */
	renderedImages?: ReactElement;

	deviceDefinitionId?: IDeviceDefinitionId;
}

export function DeviceDefinitionEditor(props: IProps) {
	const { initialDefinitionName, initialSpecifications, initialAcceptsUnits, error } = props;

	const specificationEditorRef = useRef<ISpecificationEditorActions | null>(null);

	const [errors, setErrors] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const [definitionName, setDefinitionName] = useState(initialDefinitionName ?? "");
	const [deviceDefinition, setDeviceDefinition] = useState<IDeviceDefinitionId | undefined>(
		props.deviceDefinition as IDeviceDefinitionId | undefined
	);

	const [specifications, setSpecifications] = useState<ISpecification[]>(
		initialSpecifications ?? []
	);
	const [acceptUnits, setAcceptUnits] = useState<UnitKind[]>(initialAcceptsUnits ?? []);
	const [deviceRecordsData, setDeviceRecordsData] = useState(acceptUnits.length > 0);

	const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
	const [unsavedChanges, setUnsavedChanges] = useState(false);
	const editMode = initialDefinitionName !== undefined;

	assert(
		(editMode && props.onSubmitEdit !== undefined) ||
			(!editMode && props.onSubmitAdd !== undefined),
		"At least one onSubmit (onSubmitEdit or onSubmitAdd) prop should be defined"
	);

	// If someone navigates to a different device definition which is listed because we inherit from
	// it we need to render a new editor
	const [deviceDefinitionEditor, setDeviceDefinitionEditor] = useState<
		IDeviceDefinitionId | undefined
	>(undefined);

	if (deviceDefinitionEditor) {
		return (
			<EditDeviceDefinition
				closeModal={() => setDeviceDefinitionEditor(undefined)}
				id={deviceDefinitionEditor}
			/>
		);
	}

	return (
		<>
			{showUnsavedChangesModal && (
				<UnsavedChangesModal
					onCancel={() => setShowUnsavedChangesModal(false)}
					onConfirm={props.closeModal}
				/>
			)}
			<EuiModal onClose={props.closeModal} style={{ width: "50vw" }}>
				<EuiModalHeader>
					<EuiModalHeaderTitle>{editMode ? "Edit" : "Add"} Device-Type</EuiModalHeaderTitle>
				</EuiModalHeader>
				<EuiModalBody>
					{error && (
						<>
							<EuiCallOut title="Sorry, there was an error" color="danger" iconType="alert">
								{error}
							</EuiCallOut>
							<EuiSpacer />
						</>
					)}
					<EuiForm isInvalid={!!errors.length} error={errors} component="form">
						<EuiFormRow label={"Device Type Name"} fullWidth>
							<UniqueName
								fullWidth
								value={definitionName}
								onChange={(e) => setDefinitionName(e.target.value)}
								uniqueName={{
									checkFor: "DEVICE_DEFINITION",
									setErrors,
									formState: { isLoading, setIsLoading },
									ignoreValidationForValue: initialDefinitionName,
								}}
							/>
						</EuiFormRow>
						<EuiFormRow label={"Sub-type of"} fullWidth>
							<EuiFlexGroup>
								<EuiFlexItem>
									<DeviceDefinitionSelection
										value={deviceDefinition}
										onChange={setDeviceDefinition}
										showUndefined
										forDeviceDefinition={props.deviceDefinitionId}
									/>
								</EuiFlexItem>
								{deviceDefinition !== undefined && (
									<EuiFlexItem grow={false}>
										<EuiButtonEmpty onClick={() => setDeviceDefinitionEditor(deviceDefinition)}>
											Edit Type
										</EuiButtonEmpty>
									</EuiFlexItem>
								)}
							</EuiFlexGroup>
						</EuiFormRow>
						<EuiFormRow label={"Specifications"} fullWidth>
							<SpecificationEditorDevices
								ref={specificationEditorRef}
								specifications={specifications}
								setSpecifications={setSpecifications}
								setUnsavedChanges={setUnsavedChanges}
							/>
						</EuiFormRow>
						<InheritedSpecificationsDevice
							baseSpecifications={specifications}
							deviceDefinitions={deviceDefinition ? [deviceDefinition] : []}
							onClickSpecificationSource={setDeviceDefinitionEditor}
							onOverwriteInheritedSpecification={(name) => {
								if (!specificationEditorRef.current !== null) {
									specificationEditorRef.current?.addSpecification(name, "");
								}
							}}
						/>
						<EuiFormRow label={"Records data"} fullWidth>
							<EuiSwitch
								label={"Are devices of this type able to record data?"}
								checked={deviceRecordsData}
								onChange={(e) => setDeviceRecordsData(e.target.checked)}
							/>
						</EuiFormRow>
						{deviceRecordsData && (
							<EuiFormRow label={"Accepted units"} fullWidth>
								<KnownUnitsSelection
									fullWidth
									value={acceptUnits}
									isDisabled={!deviceRecordsData}
									onChange={(e) => setAcceptUnits(e)}
								/>
							</EuiFormRow>
						)}
						{props.renderedImages && (
							<EuiFormRow label={"Images"} fullWidth>
								<EuiFlexGroup>{props.renderedImages}</EuiFlexGroup>
							</EuiFormRow>
						)}
						<EuiFormRow>
							<EuiFlexGroup>
								{props.onEditImages !== undefined && (
									<EuiFlexItem>
										<EuiButton
											onClick={() => {
												assertDefined(props.onEditImages);
												props.onEditImages();
											}}
										>
											Edit images
										</EuiButton>
									</EuiFlexItem>
								)}
								<EuiFlexItem>
									<EuiButton
										fill
										onClick={() => {
											if (errors.length > 0 || isLoading) {
												return;
											}

											if (!unsavedChanges) {
												if (editMode) {
													assertDefined(props.onSubmitEdit);
													props.onSubmitEdit(
														definitionName,
														deviceDefinition,
														specifications,
														deviceRecordsData ? acceptUnits : []
													);
												} else {
													assertDefined(props.onSubmitAdd);
													props.onSubmitAdd(
														definitionName,
														deviceDefinition,
														specifications,
														deviceRecordsData ? acceptUnits : []
													);
												}
											} else {
												setShowUnsavedChangesModal(true);
											}
										}}
										isLoading={props.isLoading}
										isDisabled={isLoading}
									>
										Save
									</EuiButton>
								</EuiFlexItem>
							</EuiFlexGroup>
						</EuiFormRow>
					</EuiForm>
				</EuiModalBody>
			</EuiModal>
		</>
	);
}
