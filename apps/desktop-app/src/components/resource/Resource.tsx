import { EuiCallOut, EuiPageTemplate } from "@elastic/eui";
import React from "react";
import { graphql } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";

import { ResourceGeneric } from "./ResourceGeneric";
import { ResourceTabularData } from "./ResourceTabularData";
import { AdactaPageTemplate } from "../layout/AdactaPageTemplate";

import type { ResourceQuery } from "@/relay/ResourceQuery.graphql";

export const ResourceGraphQLQuery = graphql`
	query ResourceQuery($resourceId: ID!, $first: Int!, $after: String, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			resource(id: $resourceId) {
				__typename
				...ResourceTabularData_data @arguments(first: $first, after: $after)
				...ResourceGeneric_data
			}
		}
	}
`;

export function Resource(props: { queryRef: PreloadedQuery<ResourceQuery> }) {
	const data = usePreloadedQuery(ResourceGraphQLQuery, props.queryRef);
	const { resource } = data.repository;

	switch (resource?.__typename) {
		case "ResourceGeneric":
			return <ResourceGeneric data={resource} />;
		case "ResourceTabularData":
			return <ResourceTabularData data={resource} />;
	}

	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header pageTitle={"Resource"} description={"Error: Not Found"} />
			<EuiPageTemplate.Section>
				<EuiCallOut
					title={`The resource cannot be rendered because its type (${
						resource !== null ? resource?.__typename : "null"
					}) is unrecognized.`}
					color="warning"
					iconType="alert"
				/>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}
