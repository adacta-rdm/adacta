import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import type { ISearchResultProps } from "./SearchResult";
import { SearchResult } from "./SearchResult";

import type { SearchResultsSamples$key } from "@/relay/SearchResultsSamples.graphql";

const SearchResultsSamplesGraphQLFragment = graphql`
	fragment SearchResultsSamples on Node {
		... on Sample {
			__typename
			id
			name
			device {
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

export function SearchResultsSamples(props: {
	searchResults: SearchResultsSamples$key;
	repositoryId: string;
	close: () => void;
}) {
	const node = useFragment(SearchResultsSamplesGraphQLFragment, props.searchResults);

	if (node.__typename !== "Sample") {
		return null;
	}

	return (
		<SearchResult
			title={node.name}
			link={[
				"/repositories/:repositoryId/samples/:sampleId",
				{ repositoryId: props.repositoryId, sampleId: node.id },
			]}
			iconType={"Sample"}
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
				if (node.device) {
					properties.push({
						text: node.device.name,
						link: [
							"/repositories/:repositoryId/devices/:deviceId/",
							{ repositoryId: props.repositoryId, deviceId: node.device.id },
						],
						iconType: "Sample",
					});
				}
				return properties;
			})()}
		/>
	);
}
