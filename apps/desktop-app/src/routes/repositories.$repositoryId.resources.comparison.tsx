import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiPageTemplate,
	EuiSpacer,
	EuiSwitch,
	EuiToolTip,
} from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import { useDebounce, useDebounceCallback } from "@react-hook/debounce";
import React, { Suspense, useState } from "react";
import { graphql, loadQuery } from "react-relay";
import { usePreloadedQuery } from "react-relay/hooks";

import { ListPageLoading } from "../components/layout/ListPageLoading";

import type { repositoriesRepositoryIdResourcesComparisonQuery as Query } from "@/relay/repositoriesRepositoryIdResourcesComparisonQuery.graphql";
import type { GetDataArgs, Props } from "@/routes/repositories.$repositoryId.resources.comparison";
import { ChartLoading } from "~/apps/desktop-app/src/components/chart/ChartLoading";
import { MultipleResourceChart } from "~/apps/desktop-app/src/components/chart/MultipleResourceChart";
import { AdactaPageTemplate } from "~/apps/desktop-app/src/components/layout/AdactaPageTemplate";
import { MultiTimeSelector } from "~/apps/desktop-app/src/components/resource/MultiTimeSelector";
import { ResourceLink } from "~/apps/desktop-app/src/components/resource/ResourceLink";
import { useRouter } from "~/apps/desktop-app/src/hooks/useRouter";
import { useRepositoryId } from "~/apps/desktop-app/src/services/router/UseRepoId";
import { secondsToHMS } from "~/apps/desktop-app/src/utils/secondsToHMS";

export type QueryParams = {
	resourceIds?: string[];
	offsets?: number[];
	alignStart?: boolean;
};

const ResourceComparisonViewGraphqlQuery = graphql`
	query repositoriesRepositoryIdResourcesComparisonQuery($repositoryId: ID!, $resourceIds: [ID!]!) {
		repository(id: $repositoryId) {
			nodes(ids: $resourceIds) {
				... on ResourceTabularData {
					id
					...ResourceLink
				}
			}
		}
	}
`;

function getData({ match, relayEnvironment }: GetDataArgs) {
	const resourceIds = match.query.resourceIds ?? [];

	return loadQuery<Query>(
		relayEnvironment,
		ResourceComparisonViewGraphqlQuery,
		{
			repositoryId: match.params.repositoryId,
			resourceIds,
		},
		{ fetchPolicy: "store-and-network" }
	);
}

export default function Route(props: Props<typeof getData>) {
	return (
		<AdactaPageTemplate>
			<EuiPageTemplate.Header
				pageTitle={
					<EuiFlexGroup alignItems="baseline" gutterSize="xs">
						<EuiFlexItem grow={false}>Resources</EuiFlexItem>
					</EuiFlexGroup>
				}
			/>
			<EuiPageTemplate.Section>
				<Suspense fallback={<ListPageLoading pageTitle="Resources" />}>
					<ResourceComparisonView {...props} />
				</Suspense>
			</EuiPageTemplate.Section>
		</AdactaPageTemplate>
	);
}

export function ResourceComparisonView(props: Props<typeof getData>) {
	const {
		repository: { nodes: resources },
	} = usePreloadedQuery(ResourceComparisonViewGraphqlQuery, props.data);
	const selectedResources = props.match.query.resourceIds ?? [];
	const showComparisonAlignStart = props.match.query.alignStart ?? false;
	const offsets = props.match.query.offsets ?? selectedResources.map(() => 0);

	const setOffsets = useDebounceCallback(
		(offsets: number[]) => props.setQueryParam("offsets", offsets),
		300
	);

	const [offsetEditMode, setOffsetEditMode] = useState(false);
	const repositoryId = useRepositoryId();
	const { router } = useRouter();

	const onLeaveComparisonView = () => {
		router.push("/repositories/:repositoryId/resources/", {
			repositoryId,
		});
	};

	// This state is used to highlight the resource in the chart when hovering over the resource in the list
	// The state is debounced to prevent flickering when moving the mouse over the resource names
	const [hoveredResource, setHoveredResource] = useDebounce<string | undefined>(undefined, 500);

	return (
		<>
			<EuiFlexGroup>
				<EuiFlexItem grow={false}>
					<EuiButton onClick={() => onLeaveComparisonView()}>Back to resource list</EuiButton>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<EuiButton onClick={() => setOffsetEditMode(!offsetEditMode)}>Edit offsets</EuiButton>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>
					<EuiToolTip
						content={
							"Aligns all resources to the same start time. Instead of different absolute start times, a common start point is assumed for all data series."
						}
					>
						<EuiSwitch
							label={"Align begin"}
							checked={showComparisonAlignStart}
							onChange={(e) => props.setQueryParam("alignStart", e.target.checked)}
						/>
					</EuiToolTip>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiSpacer />
			<EuiFlexGroup direction={"column"}>
				{resources.map((r) => {
					assertDefined(r?.id);
					const index = selectedResources.findIndex((s) => s === r.id);
					const [h, m, s] = secondsToHMS(offsets[index]).map((n) => String(n).padStart(2, "0"));
					return (
						<EuiFlexItem
							key={r.id}
							onMouseEnter={() => setHoveredResource(r.id)}
							onMouseLeave={() => setHoveredResource(undefined)}
						>
							<ResourceLink resource={r} />
							Offset: {h}:{m}:{s}
							{offsetEditMode && (
								<MultiTimeSelector
									value={offsets[index]}
									onChange={(vNew) => {
										setOffsets(offsets.map((vOld, i) => (i === index ? vNew : vOld)));
									}}
								/>
							)}
						</EuiFlexItem>
					);
				})}
			</EuiFlexGroup>
			<EuiSpacer />
			<Suspense fallback={<ChartLoading />}>
				<MultipleResourceChart
					resourceIds={selectedResources}
					highlightResourceId={hoveredResource}
					alignStart={showComparisonAlignStart}
					offsets={offsets.map((o) => o * 1000)}
				/>
			</Suspense>
		</>
	);
}
