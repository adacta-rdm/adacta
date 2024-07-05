import assert from "assert";

import { EuiDescriptionList, EuiFlexGroup, EuiFlexItem, EuiSpacer } from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import { uniqBy } from "lodash";
import type { ReactElement, ReactNode } from "react";
import React, { Suspense, useState } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { DeleteResource } from "./DeleteResource";
import { ResourceFileDownloadButton } from "./ResourceFileDownloadButton";
import { ResourceHierarchyNavigation } from "./ResourceHierarchyNavigation";
import { ResourceTabularDataTable } from "./ResourceTabularDataTable";
import { ResourceTabularDataTableLoading } from "./ResourceTabularDataTableLoading";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { Link } from "../Link";
import { ResourceChart } from "../chart/ResourceChart";
import { DateTime } from "../datetime/DateTime";
import { TabbedPageLayout } from "../layout/TabbedPageLayout";
import { OriginRepoIndicator } from "../originRepo/OriginRepoIndicator";
import { ProjectEditorAsHeaderElement } from "../project/projectEditor/ProjectEditorAsHeaderElement";
import { SampleLink } from "../sample/SampleLink";

import type { ResourceTabularData_data$key } from "@/relay/ResourceTabularData_data.graphql";
import { UserLink } from "~/apps/desktop-app/src/components/user/UserLink";
import { createDate, createMaybeDate } from "~/lib/createDate";

const ResourceTabularDataDataGraphQLFragment = graphql`
	fragment ResourceTabularData_data on ResourceTabularData
	@argumentDefinitions(first: { type: "Int" }, after: { type: "String" }) {
		id
		name
		subName
		begin
		end
		parent {
			id
			name
			... on ResourceGeneric {
				__typename
				downloadURL
			}
		}
		devices {
			id
			samples {
				sample {
					id
					...SampleLink
				}
				timeframes {
					begin
					end
				}
			}
		}
		children {
			edges {
				node {
					name
					subName
					id
				}
			}
		}
		metadata {
			creator {
				...UserLink
			}
		}
		...ProjectEditorAsHeaderElement
		...ResourceTabularDataTable_data @arguments(first: $first, after: $after)
		...OriginRepoIndicator
	}
`;

export function ResourceTabularData(props: { data: ResourceTabularData_data$key }) {
	const data = useFragment(ResourceTabularDataDataGraphQLFragment, props.data);
	const [hideDevices, setHideDevices] = useState<string[] | undefined>(undefined);
	const { router, repositoryId } = useRepoRouterHook();

	const { devices, parent } = data;

	const allDeviceIds = devices.flatMap((d) => d?.id ?? []);

	assert(devices.length);

	const solo = (id: string) => setHideDevices(allDeviceIds.filter((s) => s !== id));
	const show = (id: string) => setHideDevices((hideDevices ?? []).filter((s) => s !== id));
	const hide = (id: string) => setHideDevices([...(hideDevices ?? []), id]);
	const showAll = () => setHideDevices(undefined);

	const samples = uniqBy(
		devices.flatMap((d) =>
			d?.samples
				.filter(
					(s) =>
						// Filter Timeframes which overlap with the timeframe in which the resource was recorded
						s.timeframes.filter((t) => {
							// See ResourceTabularData schema for justification
							assertDefined(data.begin);
							assertDefined(data.end);
							return (
								createDate(t.begin) <= createDate(data.end) &&
								createDate(data.begin) <= (createMaybeDate(t.end) ?? Infinity)
							);
						}).length
				)
				.map((s) => s.sample)
		),
		(s) => s?.id
	);

	// const nodes: Node[] = Object.values(groupBy(devices.filter(isNonNullish), (d) => d.id)).map(
	// 	(devices) => {
	// 		// All devices in `devices` are the same (see groupBy lambda)
	// 		const device = devices[0];
	// 		return {
	// 			id: device.id,
	// 			label: (
	// 				<EuiFlexGroup key={device.id} gutterSize="s">
	// 					<EuiFlexItem grow={false}>
	// 						<DeviceLink device={device} />
	// 					</EuiFlexItem>
	// 					<EuiFlexItem grow={false}>
	// 						{devices.length > 1 ? (
	// 							<EuiBadge color="hollow">{devices.length} Data series</EuiBadge>
	// 						) : null}
	// 					</EuiFlexItem>
	// 				</EuiFlexGroup>
	// 			),
	// 			icon: <AdactaIcon type={"Device"} />,
	// 			children:
	// 				device.samples
	// 					.filter(
	// 						(s) =>
	// 							// Filter Timeframes which overlap with the timeframe in which the resource was recorded
	// 							s.timeframes.filter((t) => {
	// 								// See ResourceTabularData schema for justification
	// 								assertDefined(data.begin);
	// 								assertDefined(data.end);
	// 								return (
	// 									createDate(t.begin) <= createDate(data.end) &&
	// 									createDate(data.begin) <= (createMaybeDate(t.end) ?? Infinity)
	// 								);
	// 							}).length
	// 					)
	// 					.map(({ sample }) => ({
	// 						id: sample.id,
	// 						label: <Link to={routerService.sample(sample.id)}>{sample.name}</Link>,
	// 						icon: <AdactaIcon type={"Sample"} />,
	// 					})) ?? [],
	// 		};
	// 	}
	// );

	const overview: Array<{
		title: NonNullable<ReactNode>;
		description: NonNullable<ReactNode>;
	}> = [
		{
			title: "Samples",
			description: (
				<EuiFlexGroup direction={"column"} gutterSize={"s"}>
					{samples.map((s, i) => (
						<EuiFlexItem key={i}>
							<SampleLink sample={s} />
						</EuiFlexItem>
					))}
				</EuiFlexGroup>
			),
		},
		{
			title: "Time of recording",
			description: (
				<>
					From <DateTime date={createMaybeDate(data.begin)} /> until{" "}
					<DateTime date={createMaybeDate(data.end)} />{" "}
				</>
			),
		},
	];

	if (parent) {
		overview.push({
			title: "Derived from",
			description: (
				<Link
					to={[
						"/repositories/:repositoryId/resources/:resourceId",
						{ repositoryId, resourceId: parent.id },
					]}
				>
					{parent.name}
				</Link>
			) ?? <></>,
		});
	}

	const actions: ReactElement[] = [];
	if (data.parent?.__typename === "ResourceGeneric" && data.parent.downloadURL) {
		actions.push(
			<ResourceFileDownloadButton key="download" fileName={data.name} resourceId={data.parent.id} />
		);
	}

	return (
		<TabbedPageLayout
			pageHeader={{
				pageTitle: (
					<>
						Resource {data.name} <OriginRepoIndicator metadata={data} />
					</>
				),
				description: (
					<>
						{data.subName}
						<br />
						Created by: <UserLink user={data.metadata.creator} />
						<ProjectEditorAsHeaderElement data={data} />
					</>
				),
				rightSideItems: [
					<ResourceHierarchyNavigation
						key="navigation"
						parentResource={data.parent}
						childResources={data.children.edges.map((e) => e.node)}
					/>,
					<DeleteResource
						size={"s"}
						key={"delete"}
						buttonStyle={"button"}
						disabled={data.children.edges.length > 0}
						resourceId={data.id}
						connections={[]}
						onResourceDeleted={() =>
							router.push("/repositories/:repositoryId/resources/", { repositoryId })
						}
					/>,
					...actions,
				],
				tabs: [
					{
						label: "Overview",
						isSelected: true,
						id: "overview",
						content: (
							<>
								<EuiDescriptionList type="column" listItems={overview} />
								<EuiSpacer />
								<ResourceChart
									resourceId={data.id}
									hideDevices={hideDevices}
									showAll={showAll}
									show={show}
									solo={solo}
									hide={hide}
									// customLegend={
									// 	<EuiTreeView
									// 		showExpansionArrows
									// 		expandByDefault
									// 		items={nodes}
									// 		aria-label="Device Tree View"
									// 	/>
									// }
								/>
							</>
						),
					},
					{
						label: "Table",
						id: "table",
						content: (
							<Suspense fallback={<ResourceTabularDataTableLoading />}>
								<ResourceTabularDataTable data={data} />
							</Suspense>
						),
					},
				],
			}}
		/>
	);
}
