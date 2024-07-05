import React from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";

import { AddOrEditComponentUsageModal } from "./AddOrEditComponentUsageModal";
import { useService } from "../../../services/ServiceProvider";
import { useRepositoryIdVariable } from "../../../services/router/UseRepoId";
import { ToasterService } from "../../../services/toaster/ToasterService";

import type { AddComponentUsageModalMutation } from "@/relay/AddComponentUsageModalMutation.graphql";
import type { AddOrEditComponentUsageModalFragment$key } from "@/relay/AddOrEditComponentUsageModalFragment.graphql";
import type { EditComponentUsageModalQuery } from "@/relay/EditComponentUsageModalQuery.graphql";
import { createIDatetime, createMaybeIDatetime } from "~/lib/createDate";

const AddComponentGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation AddComponentUsageModalMutation(
		$repositoryId: ID!
		$input: AddComponentInput!
		$time: DateTime
	) {
		repository(id: $repositoryId) {
			addComponent(input: $input) {
				...DeviceOverview @arguments(time: $time)
			}
		}
	}
`;

interface IProps {
	viewTimestamp?: Date;
	viewDeviceId: string; // DeviceId of the device which is viewed while this modal is open

	deviceId: string;
	onClose: () => void;

	device: AddOrEditComponentUsageModalFragment$key;
}

/**
 * Helper Component which lazy loads the needed fragment.
 * This is useful if we want to edit/add to Device A while we're viewing Device B
 */
export function AddComponentUsageModalLazy(props: Omit<IProps, "device">) {
	const query = graphql`
		query AddComponentUsageModalQuery($deviceId: ID!, $repositoryId: ID!) {
			repository(id: $repositoryId) {
				device(id: $deviceId) {
					...AddOrEditComponentUsageModalFragment
				}
			}
		}
	`;
	const { repository: data } = useLazyLoadQuery<EditComponentUsageModalQuery>(query, {
		deviceId: props.deviceId,
		...useRepositoryIdVariable(),
	});
	return <AddComponentUsageModal device={data.device} {...props} />;
}

export function AddComponentUsageModal(props: IProps) {
	const repositoryIdVariable = useRepositoryIdVariable();
	const toaster = useService(ToasterService);
	const [commitAddComponents, inFlight] = useMutation<AddComponentUsageModalMutation>(
		AddComponentGraphQLMutation
	);

	function addComponent(
		componentId: string,
		parentId: string,
		name: string,
		begin: Date,
		end?: Date
	) {
		commitAddComponents({
			variables: {
				input: {
					returnedDeviceId: props.viewDeviceId,
					componentId,
					parentDeviceId: parentId,
					name,
					begin: createIDatetime(begin),
					end: createMaybeIDatetime(end),
				},
				time: createMaybeIDatetime(props.viewTimestamp),
				...repositoryIdVariable,
			},
			onCompleted: () => props.onClose(),
			onError: (e) => toaster.addToast("Add component failed", e.message, "danger"),
			updater: (cache) => {
				if (!props.viewTimestamp) {
					// Invalidate cache if we are viewing a "live" viewtimedProperties
					cache.invalidateStore();
				}
			},
		});
	}

	return (
		<AddOrEditComponentUsageModal
			deviceId={props.deviceId}
			onClose={props.onClose}
			onSubmit={(componentID, name, start, end) => {
				addComponent(componentID, props.deviceId, name, start, end);
			}}
			device={props.device}
			isLoading={inFlight}
		/>
	);
}
