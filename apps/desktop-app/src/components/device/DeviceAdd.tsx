import { assertDefined } from "@omegadot/assert";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { useMutation } from "react-relay";
import { graphql } from "relay-runtime";

import { DeviceEditor } from "./DeviceEditor";
import { useService } from "../../services/ServiceProvider";
import { HistoryService } from "../../services/history/HistoryService";
import { useRepositoryId } from "../../services/router/UseRepoId";
import { ToasterService } from "../../services/toaster/ToasterService";

import type {
	DeviceAddMutation,
	DeviceAddMutation$variables,
} from "@/relay/DeviceAddMutation.graphql";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

interface IProps {
	closeModal: () => void;

	/**
	 * This component provides two different ways of fetching updated data (fragment required for
	 * flat list or fragment required for hierarchical list). For both cases a different target
	 * connection can be supplied
	 */
	connections:
		| // flat required, hierarchical optional
		{ connectionIdFlat: string[]; connectionIdHierarchical?: string[] }
		// flat optional, hierarchical required
		| { connectionIdFlat?: string[]; connectionIdHierarchical: string[] };
}

const DeviceAddGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation DeviceAddMutation(
		$connections: [ID!]!
		$connectionsHierarchical: [ID!]!
		$insert: Insert_DeviceInput!
		$repositoryId: ID!
	) {
		repository(id: $repositoryId) {
			upsertDevice(insert: $insert) {
				add {
					appendedEdge @prependEdge(connections: $connections) {
						isNewlyCreated

						node {
							id # Fetch the id of the newly created device to inject it into the history
						}

						...DeviceTable_devices
					}
					appendedEdgeHierarchical @prependEdge(connections: $connectionsHierarchical) {
						isNewlyCreated
						node {
							...DeviceListHierarchicalGraphQLFragment
						}
					}
				}
			}
		}
	}
`;

export function DeviceAdd(props: IProps) {
	const [commitAddDevice, addDeviceInFlight] =
		useMutation<DeviceAddMutation>(DeviceAddGraphQLMutation);

	const [deviceName, setDeviceName] = useState("");
	const [deviceSpecifications, setDeviceSpecifications] = useState<ISpecification[]>([]);
	const [deviceDefinition, setDeviceDefinition] = useState<IDeviceDefinitionId | undefined>(
		undefined
	);
	const [assignShortId, setAssignShortId] = useState(false);

	const history = useService(HistoryService);
	const toaster = useService(ToasterService);

	const addDevice = (input: DeviceAddMutation$variables["insert"]["input"]) => {
		commitAddDevice({
			variables: {
				repositoryId,
				insert: {
					input,
				},
				connections: props.connections.connectionIdFlat ?? [],
				connectionsHierarchical: props.connections.connectionIdHierarchical ?? [],
			},
			onError: (e) => toaster.addToast("Add Device failed", e.message, "danger"),
			onCompleted: (data) => {
				const deviceId = data.repository.upsertDevice?.add?.appendedEdge?.node.id;
				// Add the newly created device to the history
				if (deviceId != undefined) {
					history.push("/repositories/:repositoryId/devices/:deviceId/", {
						deviceId,
						repositoryId,
					});
				}
				props.closeModal();
			},
		});
	};

	const repositoryId = useRepositoryId();

	return (
		<DeviceEditor
			closeModal={props.closeModal}
			onSubmit={() => {
				assertDefined(deviceDefinition);

				addDevice({
					name: deviceName,
					deviceDefinition,
					specifications: deviceSpecifications,
					assignShortId,
				});
			}}
			isLoading={addDeviceInFlight}
			state={{
				deviceName,
				deviceSpecifications,
				deviceDefinition,
				assignShortId,
				setDeviceName,
				setDeviceSpecifications,
				setDeviceDefinition,
				setAssignShortId,
			}}
		/>
	);
}
