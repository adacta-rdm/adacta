import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { ISearchResultProps } from "./SearchResult";
import { SearchResult } from "./SearchResult";

import type { SearchResultsResources$key } from "@/relay/SearchResultsResources.graphql";

const SearchResultsResourcesGraphQLFragment = graphql`
	fragment SearchResultsResources on Node {
		... on ResourceTabularData {
			__typename
			id
			name
			devices {
				id
				name
			}
			metadata {
				creator {
					id
					name
				}
			}
			...SearchResult
		}
		... on ResourceGeneric {
			__typename
			id
			name
			devices {
				id
				name
			}
			metadata {
				creator {
					id
					name
				}
			}
			...SearchResult
		}
	}
`;

export function SearchResultsResources(props: {
	searchResults: SearchResultsResources$key;
	repositoryId: string;
	close: () => void;
}) {
	const node = useFragment(SearchResultsResourcesGraphQLFragment, props.searchResults);

	if (node.__typename !== "ResourceGeneric" && node.__typename !== "ResourceTabularData") {
		return null;
	}

	return (
		<SearchResult
			title={node.name}
			link={[
				"/repositories/:repositoryId/resources/:resourceId",
				{ repositoryId: props.repositoryId, resourceId: node.id },
			]}
			iconType={"Resource"}
			close={props.close}
			metadata={node}
			properties={(() => {
				const properties: ISearchResultProps["properties"] = [
					{
						text: node.metadata.creator.name,
						link: [
							"/repositories/:repositoryId/users/:userId",
							{ repositoryId: props.repositoryId, userId: node.metadata.creator.id },
						],
						iconType: "User",
					},
				];
				if (node.devices.length > 0) {
					if (node.devices.length === 1 && node.devices[0] !== null) {
						properties.push({
							text: node.devices[0].name,
							link: [
								"/repositories/:repositoryId/devices/:deviceId/",
								{ repositoryId: props.repositoryId, deviceId: node.devices[0].id },
							],
							iconType: "Device",
						});
					} else {
						const differentDevices = [...new Set(node.devices.map((d) => d?.id))];

						properties.push({
							text: `${differentDevices.length} devices`,
							iconType: "Device",
						});
					}
				}
				return properties;
			})()}
		/>
	);
}
