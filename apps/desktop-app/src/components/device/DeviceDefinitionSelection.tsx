import React, { Suspense } from "react";
import type { GraphQLTaggedNode } from "react-relay";
import { useLazyLoadQuery } from "react-relay";
import type { FragmentRefs } from "relay-runtime";
import { graphql } from "relay-runtime";

import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { connectionToArray } from "../../utils/connectionToArray";
import { SearchableSelectLoading, SearchableSuperSelect } from "../utils/SearchableSelect";

import type {
	DeviceDefinitionSelectionForDeviceDefinitionQuery,
	DeviceDefinitionSelectionForDeviceDefinitionQuery$data,
} from "@/relay/DeviceDefinitionSelectionForDeviceDefinitionQuery.graphql";
import type { DeviceDefinitionSelectionQuery } from "@/relay/DeviceDefinitionSelectionQuery.graphql";
import { AdactaImage } from "~/apps/desktop-app/src/components/image/AdactaImage";
import type { IDeviceDefinitionId } from "~/lib/database/Ids";

const DeviceDefinitionSelectionGraphQLQuery: GraphQLTaggedNode = graphql`
	query DeviceDefinitionSelectionQuery($repositoryId: ID!) {
		repository(id: $repositoryId) {
			deviceDefinitions {
				# eslint-disable-next-line relay/unused-fields (See: connectionToArray)
				edges {
					node {
						id
						name
						imageResource {
							...AdactaImageFragment @arguments(preset: ICON)
						}
					}
				}
			}
		}
	}
`;

const DeviceDefinitionSelectionForDeviceDefinitionGraphqlQuery: GraphQLTaggedNode = graphql`
	query DeviceDefinitionSelectionForDeviceDefinitionQuery(
		$repositoryId: ID!
		$deviceDefinitionId: ID!
	) {
		repository(id: $repositoryId) {
			deviceDefinition(id: $deviceDefinitionId) {
				derivedDefinitionsFlat {
					id
				}
			}
			deviceDefinitions {
				# eslint-disable-next-line relay/unused-fields (See: connectionToArray)
				edges {
					node {
						id
						name
						imageResource {
							...AdactaImageFragment @arguments(preset: ICON)
						}
					}
				}
			}
		}
	}
`;

interface IProps {
	value?: IDeviceDefinitionId;
	onChange: (id?: IDeviceDefinitionId) => void;
	showUndefined?: boolean;
	fullWidth?: boolean;

	// If set to a device definition ID the component will filter parents which would create a loop
	forDeviceDefinition?: IDeviceDefinitionId;

	// To force re-fetching the data after a new device definition was created
	fetchKey?: number;
}

export function DeviceDefinitionSelection(props: IProps) {
	return (
		<Suspense fallback={<SearchableSelectLoading {...props} />}>
			<DeviceDefinitionSelectionCore {...props} />
		</Suspense>
	);
}

function DeviceDefinitionSelectionCore({
	value,
	onChange,
	fullWidth,
	showUndefined,
	forDeviceDefinition,
	fetchKey,
}: IProps) {
	const repositoryIdVariable = useRepositoryIdVariable();
	const info = forDeviceDefinition
		? {
				query: DeviceDefinitionSelectionForDeviceDefinitionGraphqlQuery,
				variables: { ...repositoryIdVariable, deviceDefinitionId: forDeviceDefinition },
		  }
		: { query: DeviceDefinitionSelectionGraphQLQuery, variables: repositoryIdVariable };

	const { repository: data } = useLazyLoadQuery<
		DeviceDefinitionSelectionQuery | DeviceDefinitionSelectionForDeviceDefinitionQuery
	>(
		info.query,
		info.variables,
		fetchKey !== undefined ? { fetchPolicy: "network-only", fetchKey } : undefined
	);

	const parentsWhichWouldCauseALoop = forDeviceDefinition
		? (
				data as DeviceDefinitionSelectionForDeviceDefinitionQuery$data["repository"]
		  ).deviceDefinition.derivedDefinitionsFlat.map((d) => d.id)
		: [];

	/* eslint-enable @typescript-eslint/consistent-type-assertions*/

	function renderDeviceDefinition(item: {
		name: string;
		imageResource: readonly { readonly " $fragmentSpreads": FragmentRefs<"AdactaImageFragment"> }[];
	}) {
		return (
			<>
				{item.imageResource[0] !== null && item.imageResource[0] !== undefined && item.name && (
					<AdactaImage
						imageStyle={{ marginRight: 10 }}
						icon={true}
						alt={`${item.name} preview`}
						image={item.imageResource[0]}
					/>
				)}
				{item.name}
			</>
		);
	}

	const options: {
		inputDisplay: JSX.Element;
		label: string;
		value: IDeviceDefinitionId | undefined;
	}[] = connectionToArray(data.deviceDefinitions)
		.filter((d) => d.id !== forDeviceDefinition && !parentsWhichWouldCauseALoop.includes(d.id))
		.map((d) => ({
			value: d.id as IDeviceDefinitionId,
			inputDisplay: renderDeviceDefinition(d),
			label: d.name,
		}));

	if (showUndefined) {
		options.unshift({
			value: undefined,
			inputDisplay: <>No Device-Type</>,
			label: "No Device-Type",
		});
	}

	return (
		<SearchableSuperSelect
			placeholder={"No Device-Type"}
			options={options}
			fullWidth={fullWidth}
			value={value}
			onChangeValue={(value) => {
				onChange(value);
			}}
		/>
	);
}
