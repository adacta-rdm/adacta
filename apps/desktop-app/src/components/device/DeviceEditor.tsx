import {
	EuiButton,
	EuiButtonEmpty,
	EuiFieldText,
	EuiFlexGroup,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiSwitch,
} from "@elastic/eui";
import type { ReactElement } from "react";
import React, { useRef, useState } from "react";

import { AssignShortIdButton } from "./AssignShortIdButton";
import { DeviceDefinitionSelection } from "./DeviceDefinitionSelection";
import { InheritedSpecificationsDevice } from "./InheritedSpecifications";
import { AddDeviceDefinition } from "./definition/AddDeviceDefinition";
import { EditDeviceDefinition } from "./definition/EditDeviceDefinition";
import { UnsavedChangesModal } from "./modals/UnsavedChangesModal";
import { UniqueName } from "../UniqueName";
import type { ISpecificationEditorActions } from "../specifications/SpecificationEditor";
import { SpecificationEditorDevices } from "../specifications/SpecificationEditor";

import { assertDefined } from "~/lib/assert/assertDefined";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

interface IProps {
	closeModal: () => void;
	onSubmit: (
		name: string,
		specifications: ISpecification[],
		deviceDefinitions: IDeviceDefinitionId[]
	) => void;
	isLoading: boolean;

	state: {
		deviceName?: string;
		deviceSpecifications: ISpecification[];
		deviceDefinition?: IDeviceDefinitionId;

		setDeviceName: (v: string) => void;
		setDeviceSpecifications: (v: ISpecification[]) => void;
		setDeviceDefinition: (v?: IDeviceDefinitionId) => void;

		// Only used when creating a new device
		assignShortId?: boolean;
		setAssignShortId?: (v: boolean) => void;
	};

	existingDevice?: {
		deviceId: string;
		shortId?: string;
		/**
		 * The name of the device before editing. Used to "bypass" the unique name check
		 */
		deviceName?: string;
	};

	shortId?: string;

	/**
	 * This component is written without (direct) GraphQL interaction. This is done to allow the
	 * same "editor" to work for existing Devices and for creating new Devices.
	 * For this reason this component can't render the list of current images itself.
	 */
	renderedImages?: ReactElement;
	onEditImages?: () => void;
}

export function DeviceEditor(props: IProps) {
	const { state } = props;
	const {
		deviceName,
		deviceSpecifications,
		deviceDefinition,
		setDeviceName,
		setDeviceSpecifications,
		setDeviceDefinition,
	} = state;

	const [deviceDefinitionFetchKey, setDeviceDefinitionFetchKey] = useState<number | undefined>(
		undefined
	);
	const refreshDeviceDefinitions = () => setDeviceDefinitionFetchKey((k) => (k ?? 0) + 1);

	// NOTE: This modal is often rendered conditionally (e.g. alternating with DeviceImageEditor)
	// therefore any state that should be preserved between modal openings should be stored in the
	// parent component
	const [errors, setErrors] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const [deviceDefinitionEditor, setDeviceDefinitionEditor] = useState<
		IDeviceDefinitionId | undefined
	>(undefined);
	const [deviceDefinitionAdd, setDeviceDefinitionAdd] = useState(false);

	const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
	const [unsavedChanges, setUnsavedChanges] = useState(false);

	const editMode = props.existingDevice !== undefined;
	const specificationEditorRef = useRef<ISpecificationEditorActions | null>(null);

	if (deviceDefinitionAdd) {
		return (
			<AddDeviceDefinition
				closeModal={(definitionId) => {
					// Auto-Select the newly created Device-Type
					if (definitionId) {
						setDeviceDefinition(definitionId as IDeviceDefinitionId);
					}

					// Refresh device definitions as we've hopefully added a new definition
					refreshDeviceDefinitions();

					setDeviceDefinitionAdd(false);
				}}
			/>
		);
	}

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
					<EuiModalHeaderTitle>{editMode ? "Edit" : "Add"} Device</EuiModalHeaderTitle>
				</EuiModalHeader>
				<EuiModalBody>
					<EuiForm error={errors} isInvalid={!!errors.length}>
						<EuiFormRow label={"Device Name"} fullWidth>
							<UniqueName
								fullWidth
								value={state.deviceName ?? ""}
								onChange={(e) => setDeviceName(e.target.value)}
								uniqueName={{
									checkFor: "DEVICE",
									setErrors,
									formState: { isLoading, setIsLoading },
									ignoreValidationForValue: props.existingDevice?.deviceName,
								}}
							/>
						</EuiFormRow>
						{props.existingDevice ? (
							<EuiFormRow label={"Short ID"} fullWidth>
								<EuiFlexGroup>
									<EuiFlexItem grow={8}>
										<EuiFieldText
											fullWidth
											readOnly={true}
											value={props.existingDevice.shortId}
											size={10}
										/>
									</EuiFlexItem>
									<EuiFlexItem grow={2}>
										<AssignShortIdButton
											currentShortId={props.existingDevice.shortId}
											deviceId={props.existingDevice.deviceId}
											buttonStyle={"link"}
										/>
									</EuiFlexItem>
								</EuiFlexGroup>
							</EuiFormRow>
						) : (
							<EuiFormRow
								label={"Short ID"}
								helpText={
									"Generate a new identifier matching the identifier scheme used in this repository"
								}
							>
								<EuiSwitch
									label={"Generated Short ID"}
									checked={props.state.assignShortId ?? false}
									onChange={(e) => {
										assertDefined(props.state.setAssignShortId);
										props.state.setAssignShortId(e.target.checked);
									}}
								/>
							</EuiFormRow>
						)}
						<EuiFormRow label={"Device Type"} fullWidth>
							<EuiFlexGroup>
								<EuiFlexItem grow={8}>
									<DeviceDefinitionSelection
										fetchKey={deviceDefinitionFetchKey}
										fullWidth={true}
										value={deviceDefinition}
										onChange={setDeviceDefinition}
									/>
								</EuiFlexItem>
								{deviceDefinition && (
									<EuiFlexItem grow={2}>
										<EuiButtonEmpty onClick={() => setDeviceDefinitionEditor(deviceDefinition)}>
											Edit Type
										</EuiButtonEmpty>
									</EuiFlexItem>
								)}
								<EuiButtonEmpty onClick={() => setDeviceDefinitionAdd(true)}>
									Add Type
								</EuiButtonEmpty>
							</EuiFlexGroup>
						</EuiFormRow>
						<EuiFormRow label={"Specifications"} fullWidth>
							<SpecificationEditorDevices
								ref={specificationEditorRef}
								specifications={deviceSpecifications}
								setSpecifications={setDeviceSpecifications}
								setUnsavedChanges={setUnsavedChanges}
							/>
						</EuiFormRow>

						<InheritedSpecificationsDevice
							baseSpecifications={deviceSpecifications}
							deviceDefinitions={state.deviceDefinition ? [state.deviceDefinition] : []}
							onClickSpecificationSource={setDeviceDefinitionEditor}
							onOverwriteInheritedSpecification={(name) => {
								if (!specificationEditorRef.current !== null) {
									specificationEditorRef.current?.addSpecification(name, "");
								}
							}}
						/>

						{props.renderedImages && (
							<EuiFormRow label={"Images"} fullWidth>
								<EuiFlexGroup>{props.renderedImages}</EuiFlexGroup>
							</EuiFormRow>
						)}
					</EuiForm>
				</EuiModalBody>
				<EuiModalFooter>
					{props.onEditImages !== undefined && (
						<EuiFlexItem grow={false}>
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
					<EuiButton
						fill
						onClick={() => {
							assertDefined(deviceName);
							if (errors.length > 0 || isLoading) {
								return;
							}
							assertDefined(deviceDefinition);
							if (!unsavedChanges) {
								props.onSubmit(
									deviceName,
									deviceSpecifications.map(
										(s): ISpecification => ({
											name: s.name,
											value: s.value,
										})
									),
									[deviceDefinition]
								);
								props.closeModal();
							} else {
								setShowUnsavedChangesModal(true);
							}
						}}
						isLoading={props.isLoading}
						disabled={isLoading || deviceName === undefined || deviceDefinition === undefined}
					>
						{editMode ? "Save" : "Create"}
					</EuiButton>
				</EuiModalFooter>
			</EuiModal>
		</>
	);
}
