import React from "react";
import { graphql, useLazyLoadQuery } from "react-relay";

import { Chart } from "./Chart";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";

import type { MultipleResourceChartQuery } from "@/relay/MultipleResourceChartQuery.graphql";

interface IProps {
	resourceIds: string[];
	offsets?: number[];

	alignStart?: boolean;
}

const ResourceChartGraphQLQuery = graphql`
	query MultipleResourceChartQuery(
		$repositoryId: ID!
		$resourceIds: [ID!]!
		$alignStart: Boolean
		$offsets: [Int!]
	) {
		repository(id: $repositoryId) {
			mergedResourceChart(ids: $resourceIds, alignStart: $alignStart, offsets: $offsets) {
				...ChartFragment
			}
		}
	}
`;

export function MultipleResourceChart(props: IProps) {
	const { repository: data } = useLazyLoadQuery<MultipleResourceChartQuery>(
		ResourceChartGraphQLQuery,
		{
			resourceIds: props.resourceIds,
			alignStart: props.alignStart,
			offsets: props.offsets,
			...useRepositoryIdVariable(),
		}
	);

	return (
		<>
			{data.mergedResourceChart.map((data, i) => (
				<Chart chart={data} key={i} />
			))}
		</>
	);
}
