import { EuiButton, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer } from "@elastic/eui";
import { groupBy } from "lodash-es";
import React, { useMemo, useState } from "react";
import { graphql, useLazyLoadQuery, useSubscription } from "react-relay";
import type { GraphQLSubscriptionConfig } from "relay-runtime";

import { Chart } from "./Chart";
import { ChartLoading } from "./ChartLoading";
import { LegendContextMenu } from "./legend/LegendContextMenu";
import { LegendDot } from "./legend/LegendDot";
import { LegendTree } from "./legend/LegendTree";
import { ColorAssigner } from "./utils/ColorAssigner";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { DeviceLink } from "../device/DeviceLink";

import type { ResourceChartQuery } from "@/relay/ResourceChartQuery.graphql";
import type { ResourceChartSubscription } from "@/relay/ResourceChartSubscription.graphql";

interface IProps {
	resourceId: string;
	hideDevices?: string[];

	showAll?: () => void;
	show?: (id: string) => void;
	hide?: (id: string) => void;
	solo?: (id: string) => void;
}

const ResourceChartGraphQLQuery = graphql`
	query ResourceChartQuery($resourceId: ID!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			resource(id: $resourceId) {
				... on ResourceTabularData {
					downSampled(dataPoints: 100, singleColumn: false) {
						...ChartFragment
						y {
							device {
								id
								name
								...DeviceLink
							}
							label
						}
					}
				}
			}
		}
	}
`;

export function ResourceChart(props: IProps) {
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
								y {
									device {
										id
										name
										...DeviceLink
									}
									label
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
	const [highlightSeries, setHighlightSeries] = useState<string | undefined>(undefined);
	if (data.resource?.downSampled == null) {
		return <ChartLoading />;
	}

	const colorAssigner = new ColorAssigner();

	const legendInformation = data.resource.downSampled.y.map((y) => ({
		device: y.device,
		label: y.label,
		color: colorAssigner.getColor(y.label),
	}));
	const legendInformationGrouped = Object.entries(groupBy(legendInformation, (l) => l.device?.id));

	const legendTree = (
		<LegendTree
			aria-label={"Chart Legend"}
			items={legendInformationGrouped.flatMap(([, l]) => {
				// Grouped by device. All devices are the same
				const device = l[0].device;
				if (device === null) {
					return [];
				}

				const deviceHeadline = (
					<EuiFlexGroup>
						<EuiFlexItem grow={true}>
							<DeviceLink data={device} />
						</EuiFlexItem>
						<EuiFlexItem grow={false}>
							<EuiFlexGroup gutterSize={"xs"}>
								<EuiFlexItem grow={false}>
									<LegendContextMenu
										deviceId={device.id}
										show={props.show}
										solo={props.solo}
										hide={props.hide}
									/>
								</EuiFlexItem>
								{props.hide && (
									<EuiFlexItem grow={false}>
										<EuiButtonIcon
											aria-label={`Hide ${device.name}`}
											iconType={"eyeClosed"}
											onClick={() => {
												if (props.hide) {
													props.hide(device.id);
												}
											}}
										/>
									</EuiFlexItem>
								)}
							</EuiFlexGroup>
						</EuiFlexItem>
					</EuiFlexGroup>
				);

				if (props.hideDevices?.includes(device.id)) {
					return [];
				}

				return {
					id: device.id,
					label: deviceHeadline,
					children: l.map((c) => ({
						id: `${device.id}${c.label}`,
						label: (
							<EuiFlexGroup
								onPointerEnter={() => setHighlightSeries(c.label)}
								onPointerLeave={() => setHighlightSeries(undefined)}
							>
								<EuiFlexItem grow={false}>
									<LegendDot color={c?.color} />
								</EuiFlexItem>
								<EuiFlexItem>{c.label}</EuiFlexItem>
							</EuiFlexGroup>
						),
					})),
				};
			})}
		/>
	);

	return (
		<>
			<Chart
				hideDevices={props.hideDevices}
				highlight={{ name: highlightSeries }}
				chart={data.resource.downSampled}
				customLegend={
					<>
						{props.hideDevices && props.hideDevices?.length > 0 && (
							<>
								<EuiButton
									size={"s"}
									onClick={() => {
										if (props.showAll) {
											props.showAll();
										}
									}}
								>
									Show all devices
								</EuiButton>
								<EuiSpacer />
							</>
						)}
						{legendTree}
					</>
				}
			/>
		</>
	);
}
