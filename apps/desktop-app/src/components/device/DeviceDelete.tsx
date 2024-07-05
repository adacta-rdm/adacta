import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { PropsWithConnections } from "../../interfaces/PropsWithConnections";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { useRepositoryId } from "../../services/router/UseRepoId";
import type { IDeleteButtonConfig } from "../utils/DeleteWithConfirmation";
import { DeleteWithConfirmation } from "../utils/DeleteWithConfirmation";

import type { DeviceDelete$key } from "@/relay/DeviceDelete.graphql";
import type { DeviceDeleteMutation } from "@/relay/DeviceDeleteMutation.graphql";

export function DeviceDelete(
	props: PropsWithConnections<{ device: DeviceDelete$key } & IDeleteButtonConfig>
) {
	const repositoryId = useRepositoryId();
	const { router, routerService, match } = useRepoRouterHook();
	const data = useFragment(
		graphql`
			fragment DeviceDelete on Device {
				id
				name
				usageInResource {
					__typename
				}
				# Request usages for the whole lifetime
				usagesAsProperty(timeFrame: { begin: null, end: null }) {
					__typename
				}
				properties {
					__typename
				}
			}
		`,
		props.device
	);

	const [commit, inFlight] = useMutation<DeviceDeleteMutation>(graphql`
		mutation DeviceDeleteMutation($repositoryId: ID!, $id: ID!, $connections: [ID!]!) {
			repository(id: $repositoryId) {
				deleteDevice(id: $id) {
					deletedId @deleteEdge(connections: $connections)
				}
			}
		}
	`);

	const deleteDevice = () => {
		commit({
			variables: { connections: props.connections, repositoryId, id: data.id },
			updater: (cache) => {
				// Manual cache updater required to invalidate the record when delete is called
				// from a DeviceOverview (and not as part of a connection/list)
				cache.get(data.id)?.invalidateRecord();
			},
		});

		// NOTE: In theory the router.push should not cause issues when used to navigate from the
		// list of devices to the list of devices (besides duplicate history entries) but in fact it
		// also triggers a re-render of the component with stale data where the device is still
		// present.
		const needsRedirect = !router.isActive(
			match,
			{ pathname: routerService.devicesHierarchical() },
			{ exact: true }
		);
		if (needsRedirect) {
			router.push("/repositories/:repositoryId/devices/", { repositoryId });
		}
	};

	const isDeletable =
		data.usageInResource.length == 0 &&
		data.usagesAsProperty.length == 0 &&
		data.properties.length == 0;

	return (
		<DeleteWithConfirmation
			onClick={() => deleteDevice()}
			isLoading={inFlight}
			disableReason={
				!isDeletable
					? "Cannot delete a device that is in use or was used to record data."
					: undefined
			}
			confirmationText={<>Are you sure you want to delete Device {data.name}?</>}
			buttonStyle={props.buttonStyle}
			buttonColor={props.buttonColor}
			size={props.size}
		/>
	);
}
