import lodash from "lodash-es";
import React, { useState } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { graphql, useMutation } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { DeviceEditor } from "./DeviceEditor";
import { DeviceImageEditor } from "./DeviceImageEditor";
import { ImageList } from "./ImageList";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";

import type { DeviceEditFragment$key } from "@/relay/DeviceEditFragment.graphql";
import type { DeviceEditMutation } from "@/relay/DeviceEditMutation.graphql";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";
import type { ISpecification } from "~/lib/database/documents/interfaces/ISpecification";

const DeviceEditGraphQLMutation: GraphQLTaggedNode = graphql`
	mutation DeviceEditMutation($update: Update_DeviceInput!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			upsertDevice(update: $update) {
				edit {
					id
					name
					specifications {
						name
						value
					}
				}
			}
		}
	}
`;

const DeviceEditGraphQLFragment: GraphQLTaggedNode = graphql`
	fragment DeviceEditFragment on Device {
		name
		id
		shortId

		definition {
			id
		}

		specifications {
			name
			value
		}

		...DeviceImageEditor
		...ImageList
	}
`;

export function DeviceEdit(props: { closeModal: () => void; device: DeviceEditFragment$key }) {
	const device = useFragment(DeviceEditGraphQLFragment, props.device);
	const { specifications, name, id, definition } = device;
	const [editImages, setEditImages] = useState(false);

	const [deviceName, setDeviceName] = useState(name ?? "");
	const [deviceSpecifications, setDeviceSpecifications] = useState<ISpecification[]>(
		specifications.map((s) => {
			return { name: s.name, value: s.value };
		})
	);
	const [deviceDefinition, setDeviceDefinition] = useState<IDeviceDefinitionId | undefined>(
		definition.id as IDeviceDefinitionId
	);

	const repositoryId = useRepositoryIdVariable();
	const [editDeviceMutation, inFlight] = useMutation<DeviceEditMutation>(DeviceEditGraphQLMutation);
	const editDevice = (
		name: string,
		specifications: ISpecification[],
		definitions: IDeviceDefinitionId[]
	) => {
		editDeviceMutation({
			variables: {
				update: { id, input: { name, specifications, deviceDefinition: definitions[0] } },
				...repositoryId,
			},
			onCompleted: () => props.closeModal(),
			updater: (store) => {
				const oldDefinition = definition.id;
				if (!lodash.isEqual(definitions[0], oldDefinition)) {
					store.invalidateStore();
				}
			},
		});
	};

	return (
		<>
			{editImages ? (
				<DeviceImageEditor
					deviceOrDeviceDefinition={device}
					closeModal={() => setEditImages(false)}
				/>
			) : (
				<DeviceEditor
					closeModal={props.closeModal}
					onSubmit={editDevice}
					isLoading={inFlight}
					state={{
						deviceName,
						setDeviceName,
						deviceSpecifications,
						setDeviceSpecifications,
						deviceDefinition,
						setDeviceDefinition,
					}}
					onEditImages={() => setEditImages(true)}
					renderedImages={<ImageList images={device} />}
					existingDevice={{ deviceId: id, shortId: device.shortId ?? undefined, deviceName: name }}
				/>
			)}
		</>
	);
}
