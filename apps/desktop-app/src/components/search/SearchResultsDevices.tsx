import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { ISearchResultProps } from "./SearchResult";
import { SearchResult } from "./SearchResult";

import type { SearchResultsDevices$key } from "@/relay/SearchResultsDevices.graphql";

const SearchResultsDevicesGraphQLFragment = graphql`
	fragment SearchResultsDevices on Node {
		... on Device {
			__typename
			id
			name
			definition {
				imageResource {
					dataURI
				}
			}
			parent {
				id
				name
			}
			specifications(names: ["manufacturer"]) {
				value
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

export function SearchResultsDevices(props: {
	searchResults: SearchResultsDevices$key;
	repositoryId: string;
	close: () => void;
}) {
	const node = useFragment(SearchResultsDevicesGraphQLFragment, props.searchResults);

	if (node.__typename !== "Device") {
		return null;
	}
	return (
		<SearchResult
			title={node.name}
			link={[
				"/repositories/:repositoryId/devices/:deviceId/",
				{ repositoryId: props.repositoryId, deviceId: node.id },
			]}
			imagePath={node.definition?.imageResource[0]?.dataURI}
			iconType={"Device"}
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
				if (node.parent) {
					properties.push({
						text: node.parent.name,
						link: [
							"/repositories/:repositoryId/devices/:deviceId/",
							{ repositoryId: props.repositoryId, deviceId: node.parent.id },
						],
						iconType: "Device",
					});
				}
				if (node.specifications.length > 0) {
					properties.push({
						text: node.specifications[0].value,
						iconType: "visVisualBuilder",
					});
				}

				return properties;
			})()}
		/>
	);
}
