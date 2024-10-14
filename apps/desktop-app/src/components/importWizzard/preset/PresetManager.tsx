import {
	EuiButton,
	EuiButtonIcon,
	EuiCallOut,
	EuiFlexGrid,
	EuiFlexItem,
	EuiForm,
	EuiFormRow,
	EuiIcon,
	EuiInlineEditText,
	EuiModal,
	EuiModalBody,
	EuiModalFooter,
	EuiModalHeader,
	EuiModalHeaderTitle,
	EuiPopover,
	EuiSpacer,
	EuiTable,
	EuiTableBody,
	EuiTableHeader,
	EuiTableHeaderCell,
	EuiTableRow,
	EuiTableRowCell,
	EuiText,
	EuiToolTip,
} from "@elastic/eui";
import React, { useState } from "react";
import { graphql, useFragment, useLazyLoadQuery, useMutation } from "react-relay";

import type { PropsWithConnections } from "../../../interfaces/PropsWithConnections";
import { useRepositoryId, useRepositoryIdVariable } from "../../../services/router/UseRepoId";
import { DeviceLink } from "../../device/DeviceLink";
import { UserLink } from "../../user/UserLink";
import { DeviceSelection } from "../DeviceSelection";

import type { PresetManagerDeleteMutation } from "@/relay/PresetManagerDeleteMutation.graphql";
import type { PresetManagerEditMutation } from "@/relay/PresetManagerEditMutation.graphql";
import type { PresetManagerEntry$key } from "@/relay/PresetManagerEntry.graphql";
import type { PresetManagerQuery } from "@/relay/PresetManagerQuery.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";

interface IProps {
	onClose: () => void;

	/**
	 * The PresetManager is accessed from the ImportWizard and the ImportWizard shows a list of
	 * presets for a specific device. If the PresetManager is used to assign a preset to a new
	 * Device then this connectionId is used to update that list of presets
	 */
	openerPresetConnectionId: string;
}

export const PresetManagerGraphQLQuery = graphql`
	query PresetManagerQuery($repositoryId: ID!) {
		repository(id: $repositoryId) {
			importPresets(first: 100) {
				__id
				edges {
					node {
						id
						...PresetManagerEntry
					}
				}
			}
		}
	}
`;

export function PresetManager(props: IProps) {
	const repositoryId = useRepositoryIdVariable();
	const data = useLazyLoadQuery<PresetManagerQuery>(PresetManagerGraphQLQuery, { ...repositoryId });

	return (
		<EuiModal maxWidth={"60vw"} onClose={props.onClose} style={{ minWidth: "600px" }}>
			<EuiModalHeader>
				<EuiModalHeaderTitle>Preset Manager</EuiModalHeaderTitle>
			</EuiModalHeader>
			<EuiModalBody>
				<EuiToolTip
					content={
						<>
							A preset contains a lot of settings and information. The best way to update an
							existing preset is to load it into the Import Wizard and then save it again after you
							have made the changes.
						</>
					}
				>
					<EuiText color={"subdued"} size={"s"}>
						How to edit a preset? <EuiIcon type="questionInCircle" color="subdued" />
					</EuiText>
				</EuiToolTip>
				<EuiSpacer />
				<EuiTable>
					<EuiTableHeader>
						<EuiTableHeaderCell>Name</EuiTableHeaderCell>
						<EuiTableHeaderCell>Device</EuiTableHeaderCell>
						<EuiTableHeaderCell>Columns</EuiTableHeaderCell>
						<EuiTableHeaderCell>Creator</EuiTableHeaderCell>
						<EuiTableHeaderCell>Actions</EuiTableHeaderCell>
					</EuiTableHeader>
					<EuiTableBody>
						{data.repository.importPresets.edges.map((e) => {
							return (
								<PresetManagerEntry
									key={e.node.id}
									data={e.node}
									connections={[data.repository.importPresets.__id]}
									openerPresetConnectionId={props.openerPresetConnectionId}
								/>
							);
						})}
					</EuiTableBody>
				</EuiTable>
			</EuiModalBody>
			<EuiModalFooter>
				<EuiButton onClick={props.onClose}>Close</EuiButton>
			</EuiModalFooter>
		</EuiModal>
	);
}

function PresetManagerEntry(
	props: PropsWithConnections<{
		data: PresetManagerEntry$key;
		openerPresetConnectionId: string;
	}>
) {
	const repositoryId = useRepositoryId();
	const data = useFragment(
		graphql`
			fragment PresetManagerEntry on ImportPreset {
				id
				displayName
				devices {
					id
					...DeviceLink
				}
				columns
				metadata {
					creator {
						...UserLink
					}
				}
			}
		`,
		props.data
	);

	const devices = data.devices;

	const [commitEdit, editInFlight] = useMutation<PresetManagerEditMutation>(
		graphql`
			mutation PresetManagerEditMutation($repositoryId: ID!, $update: Update_ImportPresetInput!) {
				repository(id: $repositoryId) {
					upsertImportPreset(update: $update) {
						node {
							...PresetManagerEntry
						}
					}
				}
			}
		`
	);

	const [commitDelete, deleteInFlight] = useMutation<PresetManagerDeleteMutation>(
		graphql`
			mutation PresetManagerDeleteMutation($repositoryId: ID!, $id: ID!, $connections: [ID!]!) {
				repository(id: $repositoryId) {
					deleteImportPreset(id: $id) {
						deletedId @deleteEdge(connections: $connections)
					}
				}
			}
		`
	);

	const inFlight = editInFlight || deleteInFlight;

	const [showLinkDeviceModal, setShowLinkDeviceModal] = useState(false);
	const [newDevice, setNewDevice] = useState<string | undefined>(undefined);

	function updateDevices(newDevices: string[]) {
		commitEdit({
			variables: {
				repositoryId,
				update: { id: data.id, input: { deviceId: newDevices } },
			},
			onCompleted: () => setShowLinkDeviceModal(false),
			// If a device is added or removed from a preset this can cause the list shown in the
			// "PresetSelection"-dropdown to change for this reason the whole connection gets
			// invalidated
			updater: (store) => {
				const record = store.get(props.openerPresetConnectionId);
				record?.invalidateRecord();
			},
		});
	}

	return (
		<>
			{showLinkDeviceModal && (
				<EuiModal onClose={() => setShowLinkDeviceModal(false)} style={{ minWidth: "600px" }}>
					<EuiModalHeader>
						<EuiModalHeaderTitle>Use this preset for an additional device</EuiModalHeaderTitle>
					</EuiModalHeader>
					<EuiModalBody>
						<EuiSpacer />
						<EuiForm>
							<EuiFormRow>
								<DeviceSelection deviceId={newDevice} onChange={(id) => setNewDevice(id)} />
							</EuiFormRow>
						</EuiForm>
						<EuiSpacer />
						<EuiCallOut color={"primary"} title={"When to use this feature?"}>
							This feature is useful if you have a file structure/format that is used by multiple
							devices or setups. This is is usually the case whenn the software/hardware used for
							the data acquisition is the same.
						</EuiCallOut>
					</EuiModalBody>
					<EuiModalFooter>
						<EuiButton
							color={"danger"}
							onClick={() => {
								setShowLinkDeviceModal(false);
							}}
						>
							Close
						</EuiButton>
						<EuiButton
							disabled={newDevice == undefined}
							onClick={() => {
								assertDefined(newDevice);
								const newDevices = [...devices.map((d) => d.id), newDevice];
								updateDevices(newDevices);
							}}
						>
							Save
						</EuiButton>
					</EuiModalFooter>
				</EuiModal>
			)}
			<EuiTableRow>
				<EuiTableRowCell>
					<EuiInlineEditText
						inputAriaLabel="Edit name"
						defaultValue={data.displayName ?? ""}
						isLoading={editInFlight}
						onSave={(e) => {
							commitEdit({
								variables: { repositoryId, update: { id: data.id, input: { name: e } } },
							});
						}}
						size="s"
					/>
				</EuiTableRowCell>
				<EuiTableRowCell>
					<ul>
						{devices.map((d, i) => (
							<li key={i}>
								<DeviceLink data={d} />
								{devices.length > 1 && (
									<EuiButtonIcon
										isLoading={inFlight}
										disabled={inFlight}
										iconType={"trash"}
										aria-label={"Delete device"}
										onClick={() => {
											const newDevices = devices.filter((_, j) => i != j);
											updateDevices(newDevices.map((d) => d.id));
										}}
									/>
								)}
								<EuiButtonIcon
									isLoading={inFlight}
									disabled={inFlight}
									iconType={"listAdd"}
									aria-label={"Add device"}
									onClick={() => {
										setShowLinkDeviceModal(true);
									}}
								/>
							</li>
						))}
					</ul>
				</EuiTableRowCell>
				<EuiTableRowCell>
					<ColumnColumn columns={data.columns} />
				</EuiTableRowCell>
				<EuiTableRowCell>
					<UserLink user={data.metadata.creator} />
				</EuiTableRowCell>
				<EuiTableRowCell>
					<EuiButtonIcon
						isLoading={inFlight}
						disabled={inFlight}
						iconType={"trash"}
						aria-label={"Delete preset"}
						onClick={() => {
							commitDelete({
								variables: {
									repositoryId,
									id: data.id,
									connections: props.connections,
								},
							});
						}}
					/>
				</EuiTableRowCell>
			</EuiTableRow>
		</>
	);
}

function ColumnColumn(props: { columns: readonly string[] }) {
	const { columns } = props;
	const [popoverIsOpen, setPopoverIsOpen] = useState(false);

	if (columns.length == 0) return <>No column</>;

	const button = (
		<span onClick={() => setPopoverIsOpen(!popoverIsOpen)}>{columns.length} Columns</span>
	);

	return (
		<EuiPopover button={button} isOpen={popoverIsOpen} closePopover={() => setPopoverIsOpen(false)}>
			<EuiFlexGrid columns={4}>
				{columns.map((c, i) => (
					<EuiFlexItem key={i}>{c}</EuiFlexItem>
				))}
			</EuiFlexGrid>
		</EuiPopover>
	);
}
