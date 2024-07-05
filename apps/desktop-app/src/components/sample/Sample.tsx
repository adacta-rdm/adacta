import assert from "assert";

import {
	EuiButton,
	EuiButtonIcon,
	EuiDescriptionList,
	EuiEmptyPrompt,
	EuiFlexGroup,
	EuiFlexItem,
	EuiLink,
	EuiSpacer,
} from "@elastic/eui";
import { assertDefined, isNonNullish } from "@omegadot/assert";
import React, { useState } from "react";
import { graphql } from "react-relay";
import type { PreloadedQuery } from "react-relay/hooks";
import { usePreloadedQuery } from "react-relay/hooks";

import { SampleEdit } from "./SampleEdit";
import { SampleLink } from "./SampleLink";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { Link } from "../Link";
import { ChangelogWithNotes } from "../changelog/ChangelogWithNotes";
import { DateTime } from "../datetime/DateTime";
import { TabbedPageLayout } from "../layout/TabbedPageLayout";
import { AddNote } from "../note/AddNote";
import { OriginRepoIndicator } from "../originRepo/OriginRepoIndicator";
import { ShowIfUserCanEdit } from "../originRepo/ShowIfUserCanEdit";
import { ProjectEditorAsHeaderElement } from "../project/projectEditor/ProjectEditorAsHeaderElement";
import { ResourceListTable } from "../resource/list/ResourceListTable";
import type { INoteEntry, IResourceEntry, IUsageEntry } from "../timeline/AdactaTimeline";
import { AdactaTimeline } from "../timeline/AdactaTimeline";
import { UserLink } from "../user/UserLink";

import type { AdactaTimelineNotes$data } from "@/relay/AdactaTimelineNotes.graphql";
import type { AdactaTimelineResource$data } from "@/relay/AdactaTimelineResource.graphql";
import type { AdactaTimelineUsage$data } from "@/relay/AdactaTimelineUsage.graphql";
import type { SampleQuery } from "@/relay/SampleQuery.graphql";
import { createDate, createMaybeDate } from "~/lib/createDate";
import type { IResourceId, ISampleId } from "~/lib/database/Ids";
import { convertSampleToTraversalResult } from "~/lib/inheritance/convertToTraversalResult";
import { deriveSpecifications } from "~/lib/inheritance/deriveSpecifications";

export const SampleGraphQLQuery = graphql`
	query SampleQuery($sampleId: ID!, $repositoryId: ID!) {
		repository(id: $repositoryId) {
			sample(id: $sampleId) {
				id
				name
				relatedSamplesReverse {
					type
					sample {
						...SampleLink
					}
				}
				specifications {
					name
					value
				}
				specificationsCollected {
					# eslint-disable-next-line relay/unused-fields
					level
					sample {
						id
						name
						specifications {
							name
							value
						}
					}
				}
				metadata {
					creator {
						...UserLink
					}
					creationTimestamp
				}
				devices {
					timestamp
					timestampEnd
					# eslint-disable-next-line relay/unused-fields
					device {
						id
						name
						# Ugly workaround because timeline needs this...
						# eslint-disable-next-line relay/must-colocate-fragment-spreads
						...DeviceLink
					}
					...AdactaTimelineComponents @relay(mask: false)
				}
				resources {
					begin
					end
					parent {
						...AdactaTimelineResource @relay(mask: false)
					}
					...ResourceListTableFragment
				}
				topLevelDevice {
					id
					name
				}
				notes {
					__id
					edges {
						node {
							...AdactaTimelineNotes @relay(mask: false)
							begin
						}
					}
				}
				...ShowIfUserCanEdit
				...OriginRepoIndicator
				...ChangelogWithNotes
				...ProjectEditorAsHeaderElement
			}
		}
	}
`;

export function Sample(props: { queryRef: PreloadedQuery<SampleQuery> }) {
	const { repository: data } = usePreloadedQuery(SampleGraphQLQuery, props.queryRef);

	const traversalResult = convertSampleToTraversalResult(
		data.sample.specifications,
		data.sample.specificationsCollected
	);
	const derivedSpecifications = deriveSpecifications(traversalResult);
	const specifications = [...data.sample.specifications, ...derivedSpecifications];

	const { match, router, repositoryId } = useRepoRouterHook();
	const { sample } = data;

	const [showSampleEditor, setShowSampleEditor] = useState(false);

	const viewTimestamp = match.params.sampleTimestamp
		? new Date(match.params.sampleTimestamp)
		: new Date();

	const timelineUsages: IUsageEntry[] = data.sample.devices.map((p) => ({
		itemType: "usage",
		begin: createDate(p.timestamp),
		end: createMaybeDate(p.timestampEnd),

		device: p as unknown as AdactaTimelineUsage$data,
	}));

	// Only collect parents for timeline as otherwise we get too many entries for the same timeframe
	// with the same name which is not that useful
	const parentIds = new Map<IResourceId, boolean>();
	const timelineResources: IResourceEntry[] = data.sample.resources.flatMap((u) => {
		if (u === null) {
			return [];
		}

		assertDefined(u.begin);

		// Get rid of all entries without a parent or parents which are already added

		if (u.parent?.id === undefined || parentIds.get(u.parent.id as IResourceId)) {
			return [];
		}

		parentIds.set(u.parent?.id as IResourceId, true);

		return [
			{
				itemType: "resource",
				begin: createDate(u.begin),
				end: createMaybeDate(u.end) ?? new Date(),

				resource: u.parent as unknown as AdactaTimelineResource$data,
			},
		];
	});

	const timelineNotes: INoteEntry[] =
		data.sample.notes?.edges
			.map((e) => e?.node)
			.filter(isNonNullish)
			.filter((n) => n.begin !== undefined)
			.map((n) => {
				assertDefined(n.begin, "Begin undefined (timelineNotes)");
				return {
					itemType: "note",
					begin: createDate(n.begin),
					end: createMaybeDate(n.end),
					note: n as unknown as AdactaTimelineNotes$data,
				};
			}) ?? [];

	const roots = data.sample.relatedSamplesReverse.filter((s) => s.type === "createdOutOf");
	assert(roots.length <= 1); // Currently only a single createdOutOf relation is expected
	const createdOutOfBatch =
		roots[0] !== undefined ? (
			<>
				<br />
				Created out of <SampleLink sample={roots[0].sample} />
			</>
		) : undefined;

	return (
		<>
			{showSampleEditor && (
				<SampleEdit
					sampleId={data.sample.id as ISampleId}
					closeModal={() => setShowSampleEditor(false)}
				/>
			)}
			<TabbedPageLayout
				pageHeader={{
					pageTitle: (
						<>
							Sample {data.sample.name} <OriginRepoIndicator metadata={data.sample} />
						</>
					),
					rightSideItems: [
						<ShowIfUserCanEdit key="edit" metadata={sample}>
							<EuiButton iconType="documentEdit" size="s" onClick={() => setShowSampleEditor(true)}>
								Edit
							</EuiButton>
						</ShowIfUserCanEdit>,
					],
					description: (
						<span>
							Created by <UserLink user={data.sample.metadata.creator} /> at{" "}
							<DateTime date={createDate(data.sample.metadata.creationTimestamp)} />
							{data.sample.topLevelDevice && (
								<>
									<br />
									Currently installed in setup:{" "}
									<Link
										to={[
											"/repositories/:repositoryId/devices/:deviceId/",
											{ repositoryId, deviceId: data.sample.topLevelDevice.id },
										]}
									>
										<EuiLink>{data.sample.topLevelDevice.name}</EuiLink>
									</Link>
								</>
							)}
							{match.params.sampleTimestamp ? (
								<>
									<span>
										<br />
										Viewing sample at <DateTime date={new Date(match.params.sampleTimestamp)} />
									</span>{" "}
									<EuiLink
										href="#"
										onClick={() =>
											router.push(`/repositories/:repositoryId/samples/:sampleId`, {
												repositoryId: repositoryId,
												sampleId: data.sample.id,
											})
										}
									>
										Jump to present
									</EuiLink>
								</>
							) : (
								""
							)}
							{createdOutOfBatch}
							<ProjectEditorAsHeaderElement data={data.sample} />
						</span>
					),
					tabs: [
						{
							id: "timeline",
							label: "Timeline",
							content: (
								<AdactaTimeline
									id={data.sample.id}
									name={data.sample.name}
									usages={timelineUsages}
									notes={timelineNotes}
									resources={timelineResources}
									viewTimestamp={viewTimestamp}
									button={
										<AddNote thingId={data.sample.id} connections={[data.sample.notes.__id]} />
									}
								/>
							),
						},
						...(specifications.length > 0
							? [
									{
										id: "specifications",
										label: "Specifications",
										content: (
											<>
												<ShowIfUserCanEdit metadata={sample}>
													<EuiFlexGroup direction={"column"} alignItems={"flexEnd"}>
														<EuiFlexItem>
															<EuiButtonIcon
																onClick={() => setShowSampleEditor(true)}
																iconType={"pencil"}
																aria-label={"Edit Specification"}
															/>
														</EuiFlexItem>
													</EuiFlexGroup>
												</ShowIfUserCanEdit>
												<EuiDescriptionList
													type="column"
													listItems={specifications.map((s) => ({
														title: s.name,
														description: s.value,
													}))}
												/>
											</>
										),
									},
							  ]
							: []),
						{
							id: "data",
							label: "Data",
							content: (
								<>
									{data.sample.resources.length === 0 ? (
										<EuiEmptyPrompt
											iconType="cloudDrizzle"
											body={<p>No data for this sample recorded yet.</p>}
										/>
									) : (
										<ResourceListTable
											resources={data.sample.resources.filter(isNonNullish)}
											connections={[]}
										/>
									)}
								</>
							),
						},
						{
							id: "history",
							label: "History",
							content: (
								<>
									<EuiFlexGroup justifyContent={"flexEnd"}>
										<EuiFlexItem grow={false}>
											<AddNote thingId={data.sample.id} connections={[data.sample.notes.__id]} />
										</EuiFlexItem>
									</EuiFlexGroup>
									<EuiSpacer />
									<ChangelogWithNotes data={data.sample} />
								</>
							),
						},
					],
				}}
			/>
		</>
	);
}
