import assert from "assert";

import { EuiEmptyPrompt } from "@elastic/eui";
import React, { useMemo, useState } from "react";
import { graphql, useLazyLoadQuery, useSubscription } from "react-relay";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { Chart } from "./Chart";
import { ChartLoading } from "./ChartLoading";
import { Legend } from "./legend/Legend";
import { ColorAssigner } from "./utils/ColorAssigner";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";

import type { ResourceChartQuery } from "@/relay/ResourceChartQuery.graphql";
import type { ResourceChartSubscription } from "@/relay/ResourceChartSubscription.graphql";
import { useChartActions } from "~/apps/desktop-app/src/components/chart/utils/useChartActions";

interface IProps {
	resourceId: string;
	allDeviceIds: string[];
}

const ResourceChartGraphQLQuery = graphql`
	query ResourceChartQuery($resourceId: ID!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			resource(id: $resourceId) {
				... on ResourceTabularData {
					downSampled(dataPoints: 100, singleColumn: false) {
						__typename
						... on Data {
							...ChartFragment
							...LegendFragment
						}
						... on Error {
							message
						}
					}
				}
			}
		}
	}
`;

export function ResourceChart(props: IProps) {
	const { hideDevices, hide, solo, show, showAll } = useChartActions(props.allDeviceIds);

	// This subscription updates the chart if the downsampleDataBecameReady event is emitted
	// IMPORTANT: your config should be memoized, or at least not re-computed
	// every render. Otherwise, useSubscription will re-render too frequently.
	const config: GraphQLSubscriptionConfig<ResourceChartSubscription> = useMemo(
		() => ({
			variables: {},
			subscription: graphql`
				subscription ResourceChartSubscription {
					downsampleDataBecameReady {
						resourceId
						dataPoints
						singleColumn
						resource {
							downSampled(dataPoints: 100, singleColumn: false) {
								...ChartFragment
								...LegendFragment
								... on Error {
									message
								}
							}
						}
					}
				}
			`,
		}),
		[]
	);
	useSubscription(config);

	const { repository: data } = useLazyLoadQuery<ResourceChartQuery>(ResourceChartGraphQLQuery, {
		resourceId: props.resourceId,
		...useRepositoryIdVariable(),
	});
	assert(data.resource.downSampled?.__typename !== "%other");

	const [highlightSeries, setHighlightSeries] = useState<string | undefined>(undefined);
	if (data.resource?.downSampled == null) {
		return <ChartLoading />;
	}

	if (data.resource.downSampled.__typename === "Error") {
		return (
			<EuiEmptyPrompt
				iconType="error"
				color="warning"
				title={<h2>Unable to load chart</h2>}
				body={<p>{data.resource.downSampled.message}</p>}
			/>
		);
	}

	const colorAssigner = new ColorAssigner();
	return (
		<>
			<Chart
				hideDevices={hideDevices}
				highlight={highlightSeries ? { name: highlightSeries } : undefined}
				chart={data.resource.downSampled}
				customLegend={
					<>
						<Legend
							legendInformation={data.resource.downSampled}
							getColor={(c) => colorAssigner.getColor(c)}
							show={show}
							showAll={showAll}
							solo={solo}
							hide={hide}
							hideDevices={hideDevices}
							highlightSeries={setHighlightSeries}
						/>
					</>
				}
			/>
		</>
	);
}
