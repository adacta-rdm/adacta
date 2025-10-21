import React, { useMemo, useState } from "react";
import { graphql, useLazyLoadQuery, useSubscription } from "react-relay";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { Chart } from "./Chart";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";

import type { MultipleResourceChartQuery } from "@/relay/MultipleResourceChartQuery.graphql";
import type { MultipleResourceChartSubscription } from "@/relay/MultipleResourceChartSubscription.graphql";
import { ChartLoading } from "~/apps/desktop-app/src/components/chart/ChartLoading";
import { Legend } from "~/apps/desktop-app/src/components/chart/legend/Legend";
import { ColorAssigner } from "~/apps/desktop-app/src/components/chart/utils/ColorAssigner";
import { useChartActions } from "~/apps/desktop-app/src/components/chart/utils/useChartActions";

interface IProps {
	resourceIds: string[];

	highlightResourceId?: string;

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
				...LegendFragment
				y {
					device {
						id
					}
				}
			}
		}
	}
`;

export function MultipleResourceChart(props: IProps) {
	const [fetchKey, setFetchKey] = useState(0);

	const { repository: data } = useLazyLoadQuery<MultipleResourceChartQuery>(
		ResourceChartGraphQLQuery,
		{
			resourceIds: props.resourceIds,
			alignStart: props.alignStart,
			offsets: props.offsets,
			...useRepositoryIdVariable(),
		},
		{ fetchKey, fetchPolicy: fetchKey > 0 ? "store-and-network" : undefined }
	);

	const { hideDevices, hide, solo, show, showAll } = useChartActions(
		data.mergedResourceChart.flatMap((c) =>
			c.y.flatMap((y) => {
				return y.device?.id ?? [];
			})
		)
	);

	const [highlightSeries, setHighlightSeries] = useState<string | undefined>(undefined);

	// This subscription subscribes to the downsampleDataBecameReady event and refetches the merged
	// chart if the event is emitted for one of the resources that are included in the comparison.
	// IMPORTANT: your config should be memoized, or at least not re-computed
	// every render. Otherwise, useSubscription will re-render too frequently.
	const config: GraphQLSubscriptionConfig<MultipleResourceChartSubscription> = useMemo(
		() => ({
			variables: {},
			subscription: graphql`
				subscription MultipleResourceChartSubscription {
					downsampleDataBecameReady {
						resourceId
					}
				}
			`,
			onNext: (d) => {
				const newResourceId = d?.downsampleDataBecameReady.resourceId;
				if (newResourceId && props.resourceIds.includes(newResourceId)) {
					// Increment the fetch key to refetch the data
					setFetchKey((k) => k + 1);
				}
			},
		}),
		[props.resourceIds]
	);
	useSubscription(config);

	// When the data is still downsampling for all resources a empty array is returned
	// In this case we show a loading indicator
	if (data.mergedResourceChart.length === 0) {
		return <ChartLoading />;
	}

	const colorAssigner = new ColorAssigner();

	return (
		<>
			{data.mergedResourceChart.map((data, i) => (
				<Chart
					chart={data}
					key={JSON.stringify({ ...props, key: i })}
					highlight={
						props.highlightResourceId
							? { resourceId: props.highlightResourceId }
							: highlightSeries
							? { name: highlightSeries }
							: undefined
					}
					hideDevices={hideDevices}
					customLegend={
						<Legend
							legendInformation={data}
							getColor={(c) => colorAssigner.getColor(c)}
							show={show}
							solo={solo}
							hide={hide}
							showAll={showAll}
							hideDevices={hideDevices}
							highlightSeries={(id) => {
								setHighlightSeries(id);
							}}
						/>
					}
				/>
			))}
		</>
	);
}
