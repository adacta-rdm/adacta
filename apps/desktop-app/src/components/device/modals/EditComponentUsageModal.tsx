import { assertDefined } from "@omegadot/assert";
import React from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useLazyLoadQuery, useMutation } from "react-relay";

import type { IExistingProperty } from "./AddOrEditComponentUsageModal";
import { AddOrEditComponentUsageModal } from "./AddOrEditComponentUsageModal";
import { useService } from "../../../services/ServiceProvider";
import { useRepositoryIdVariable } from "../../../services/router/UseRepoId";
import { ToasterService } from "../../../services/toaster/ToasterService";

import type { AddOrEditComponentUsageModalFragment$key } from "@/relay/AddOrEditComponentUsageModalFragment.graphql";
import type { EditComponentUsageModalMutation } from "@/relay/EditComponentUsageModalMutation.graphql";
import type { EditComponentUsageModalQuery } from "@/relay/EditComponentUsageModalQuery.graphql";
import { createIDatetime, createMaybeIDatetime } from "~/lib/createDate";

const EditComponentGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation EditComponentUsageModalMutation(
		$input: EditComponentInput!
		$time: DateTime
		$repositoryId: ID!
	) {
		repository(id: $repositoryId) {
			editComponent(input: $input) {
				...DeviceOverview @arguments(time: $time)
			}
		}
	}
`;

interface IProps {
	viewTimestamp?: Date;
	viewDeviceId: string; // DeviceId of the device which is viewed while this modal is open

	deviceId: string; // DeviceId of the device which gets edited
	onClose: () => void;
	existingProperty: IExistingProperty;

	device: AddOrEditComponentUsageModalFragment$key;
}

/**
 * Helper Component which lazy loads the needed fragment.
 * This is useful if we want to edit/add to Device A while we're viewing Device B
 */
export function EditComponentUsageModalLazy(props: Omit<IProps, "device">) {
	const query = graphql`
		query EditComponentUsageModalQuery($deviceId: ID!, $repositoryId: ID!) {
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
	return <EditComponentUsageModal device={data.device} {...props} />;
}

export function EditComponentUsageModal(props: IProps) {
	const toaster = useService(ToasterService);
	const [commitEditComponents, inFlight] = useMutation<EditComponentUsageModalMutation>(
		EditComponentGraphQLMutation
	);
	const repositoryIdVariable = useRepositoryIdVariable();

	function editComponent(
		propertyId: string,
		componentId: string,
		name: string,
		begin: Date,
		end?: Date
	) {
		commitEditComponents({
			variables: {
				input: {
					returnedDeviceId: props.viewDeviceId,
					propertyId,
					componentId,
					name,
					begin: createIDatetime(begin),
					end: createMaybeIDatetime(end),
				},
				time: createMaybeIDatetime(props.viewTimestamp),
				...repositoryIdVariable,
			},
			onError: (e) => toaster.addToast("Edit component failed", e.message, "danger"),
			onCompleted: () => props.onClose(),
			updater: (store) => {
				// Invalidate the record of the device which is viewed while this modal is open
				// This way all component trees which contain this device will be marked as stale
				store.get(props.deviceId)?.invalidateRecord();
			},
		});
	}

	return (
		<AddOrEditComponentUsageModal
			deviceId={props.deviceId}
			existingProperty={props.existingProperty}
			onClose={props.onClose}
			onSubmit={(componentID, name, start, end) => {
				assertDefined(props.existingProperty);
				editComponent(props.existingProperty.propertyId, componentID, name, start, end);
			}}
			device={props.device}
			isLoading={inFlight}
		/>
	);
}
