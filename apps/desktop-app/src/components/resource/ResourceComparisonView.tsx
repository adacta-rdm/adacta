import {
	EuiButton,
	EuiFlexGroup,
	EuiFlexItem,
	EuiSpacer,
	EuiSwitch,
	EuiToolTip,
} from "@elastic/eui";
import { assertDefined } from "@omegadot/assert";
import React, { Suspense, useState } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { MultiTimeSelector } from "./MultiTimeSelector";
import { ResourceLink } from "./ResourceLink";
import { secondsToHMS } from "../../utils/secondsToHMS";
import { ChartLoading } from "../chart/ChartLoading";
import { MultipleResourceChart } from "../chart/MultipleResourceChart";

import type { ResourceComparisonViewFragment$key } from "@/relay/ResourceComparisonViewFragment.graphql";

const ResourceComparisonViewGraphQLFragment = graphql`
	fragment ResourceComparisonViewFragment on ResourceTimed @relay(plural: true) {
		children {
			edges {
				node {
					id
					...ResourceLink
				}
			}
		}
	}
`;
export function ResourceComparisonView(props: {
	onLeaveComparisonView: () => void;
	resources: ResourceComparisonViewFragment$key;
	selectedResources: string[];
}) {
	const resources = useFragment(ResourceComparisonViewGraphQLFragment, props.resources);
	const [showComparisonAlignStart, setShowComparisonAlignStart] = useState(false);
	const [offsets, setOffsets] = useState<number[]>(
		new Array(props.selectedResources.length).fill(0)
	);
	const [offsetEditMode, setOffsetEditMode] = useState(false);

	const { onLeaveComparisonView, selectedResources } = props;
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
							onChange={(e) => setShowComparisonAlignStart(e.target.checked)}
						/>
					</EuiToolTip>
				</EuiFlexItem>
			</EuiFlexGroup>
			<EuiSpacer />
			<EuiFlexGroup direction={"column"}>
				{resources
					.flatMap((r) => r.children.edges.map((e) => e.node))
					.filter((r) => r !== null && selectedResources.includes(r.id))
					.map((r) => {
						assertDefined(r?.id);
						const index = selectedResources.findIndex((s) => s === r.id);
						const [h, m, s] = secondsToHMS(offsets[index]).map((n) => String(n).padStart(2, "0"));
						return (
							<EuiFlexItem key={r.id}>
								<ResourceLink resource={r} />
								Offset: {h}:{m}:{s}
								{offsetEditMode && (
									<MultiTimeSelector
										value={offsets[index]}
										onChange={(vNew) => {
											setOffsets((offsets) =>
												offsets.map((vOld, i) => (i === index ? vNew : vOld))
											);
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
					alignStart={showComparisonAlignStart}
					offsets={offsets.map((o) => o * 1000)}
				/>
			</Suspense>
		</>
	);
}
