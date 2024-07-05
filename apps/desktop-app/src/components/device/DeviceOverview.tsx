import {
	EuiBadge,
	EuiButton,
	EuiButtonIcon,
	EuiDescriptionList,
	EuiFlexGroup,
	EuiFlexItem,
	EuiLink,
	EuiListGroup,
	EuiSpacer,
} from "@elastic/eui";
import type { EuiDescriptionListProps } from "@elastic/eui/src/components/description_list/description_list_types";
import { assertDefined, isNonNullish } from "@omegadot/assert";
import React, { useState } from "react";
import { graphql, useRefetchableFragment, useSubscribeToInvalidationState } from "react-relay";

import { AssignShortIdButton } from "./AssignShortIdButton";
import { ComponentEuiTree } from "./ComponentEuiTree";
import { DeviceDelete } from "./DeviceDelete";
import { DeviceEdit } from "./DeviceEdit";
import { DeviceImageList } from "./DeviceImageList";
import { DeviceLink } from "./DeviceLink";
import { SetupDescriptionComponent } from "./SetupDescriptionComponent";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { useRepositoryIdVariable } from "../../services/router/UseRepoId";
import { FileUpload } from "../FileUpload";
import { Link } from "../Link";
import { ChangelogWithNotes } from "../changelog/ChangelogWithNotes";
import { DateTime } from "../datetime/DateTime";
import { TabbedPageLayout } from "../layout/TabbedPageLayout";
import { AddNote } from "../note/AddNote";
import { OriginRepoIndicator } from "../originRepo/OriginRepoIndicator";
import { ShowIfUserCanEdit } from "../originRepo/ShowIfUserCanEdit";
import { ProjectEditorAsHeaderElement } from "../project/projectEditor/ProjectEditorAsHeaderElement";
import type {
	IComponentEntry,
	INoteEntry,
	IResourceEntry,
	ISampleEntry,
	IUsageEntry,
} from "../timeline/AdactaTimeline";
import { AdactaTimeline } from "../timeline/AdactaTimeline";
import { UserLink } from "../user/UserLink";

import type { AdactaTimelineComponents$data } from "@/relay/AdactaTimelineComponents.graphql";
import type { AdactaTimelineNotes$data } from "@/relay/AdactaTimelineNotes.graphql";
import type { AdactaTimelineResource$data } from "@/relay/AdactaTimelineResource.graphql";
import type { AdactaTimelineSample$data } from "@/relay/AdactaTimelineSample.graphql";
import type { AdactaTimelineUsage$data } from "@/relay/AdactaTimelineUsage.graphql";
import type { DeviceOverview$key } from "@/relay/DeviceOverview.graphql";
import { createDate, createMaybeDate } from "~/lib/createDate";
import type { IDeviceId } from "~/lib/database/Ids";
import { convertDeviceToTraversalResult } from "~/lib/inheritance/convertToTraversalResult";
import { deriveSpecifications } from "~/lib/inheritance/deriveSpecifications";

// TODO: This fragment looks like it is too large (YouTrack Card #186)
const DeviceOverViewGraphQLFragment = graphql`
	fragment DeviceOverview on Device
	@refetchable(queryName: "DeviceOverviewQuery")
	@argumentDefinitions(time: { type: "DateTime" }) {
		id
		shortId
		name
		specifications {
			name
			value
		}
		definitions {
			# eslint-disable-next-line relay/unused-fields
			level
			definition {
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
		definition {
			id
			name
			acceptsUnit
		}
		properties {
			timestamp
			timestampEnd
			name
			value {
				__typename
				... on Device {
					id
				}
				... on Sample {
					id
					name
				}
			}
			...AdactaTimelineComponents @relay(mask: false)
		}
		# Request the whole set of usages (timeframe open on both ends)
		usagesAsProperty(timeFrame: { begin: null, end: null }) {
			timestamp
			timestampEnd
			device {
				id
				name
			}
			...AdactaTimelineUsage @relay(mask: false)
		}
		samples {
			timeframes {
				pathFromTopLevelDevice
				begin
				end
			}
			sample {
				id
				name
				...AdactaTimelineSample @relay(mask: false)
			}
		}
		topLevelDevice {
			...DeviceLink
		}
		usageInResource {
			begin
			end
			...AdactaTimelineResource @relay(mask: false)
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
		...ComponentEuiTree @arguments(time: $time)
		...SetupDescriptionComponent @arguments(time: $time)
		...DeviceEditFragment
		...OriginRepoIndicator
		...ShowIfUserCanEdit
		...DeviceImageList
		...ChangelogWithNotes
		...ProjectEditorAsHeaderElement
		...DeviceDelete
	}
`;

interface IProps {
	viewTimestamp?: Date;
	historyMode: boolean;
	device: DeviceOverview$key;
	/**
	 * Enables popover mode in which DeviceOverview won't render some information (i.e. SetupDescription)
	 */
	popoverMode?: boolean;
}

export function DeviceOverview(props: IProps) {
	const [device, refetch] = useRefetchableFragment(DeviceOverViewGraphQLFragment, props.device);
	const { router } = useRepoRouterHook();

	const [deviceEditor, setDeviceEditor] = useState(false);

	const { historyMode, popoverMode, viewTimestamp } = props;

	const repositoryIdVariable = useRepositoryIdVariable();

	// Refetch if this device got invalidated
	useSubscribeToInvalidationState([device.id], () => {
		refetch(repositoryIdVariable);
	});

	if (device.definition === null) {
		return <>Device is not completely synced</>;
	}

	const printTimeInterval = (start: string, end?: string) => {
		const endElement = end ? <DateTime date={createDate(end)} /> : <>now</>;
		return (
			<>
				Used from <DateTime date={createDate(start)} /> until {endElement}
			</>
		);
	};

	const samples = device.samples.map((p) => {
		const usages = p.timeframes
			.map((t) => printTimeInterval(t.begin, t.end ?? undefined))
			.map((usage) => ({ label: usage }));

		return {
			description: <EuiListGroup listItems={usages} maxWidth={false} />,
			title: (
				<>
					<Link
						to={[
							"/repositories/:repositoryId/samples/:sampleId",
							{ repositoryId: repositoryIdVariable.repositoryId, sampleId: p.sample.id },
						]}
					>
						{p.sample.name}
					</Link>
				</>
			),
		};
	});

	const deviceDefinitionSpecifications = convertDeviceToTraversalResult(
		device.specifications,
		device.definitions
	);
	const derivedSpecifications = deriveSpecifications(deviceDefinitionSpecifications);
	const specification: EuiDescriptionListProps["listItems"] = [
		...device.specifications,
		...derivedSpecifications,
	].map((s) => ({
		title: s.name,
		description: s.value,
	}));

	if (device.definition.acceptsUnit.length) {
		specification.push({
			title: "Records",
			description: device.definition.acceptsUnit.map((u) => <EuiBadge key={u}>{u}</EuiBadge>),
		});
	}

	const timelineSamples: ISampleEntry[] = device.samples.flatMap((s) =>
		s.timeframes.map((t) => ({
			itemType: "sample",
			begin: createDate(t.begin),
			end: createMaybeDate(t.end),
			pathFromTopLevelDevice: [...t.pathFromTopLevelDevice],
			sample: s.sample as unknown as AdactaTimelineSample$data,
		}))
	);

	const timelineComponents: IComponentEntry[] = device.properties.map((p) => ({
		itemType: "component",
		begin: createDate(p.timestamp),
		end: createMaybeDate(p.timestampEnd),

		property: p as unknown as AdactaTimelineComponents$data,
	}));

	const timelineUsages: IUsageEntry[] = device.usagesAsProperty.map((p) => ({
		itemType: "usage",
		begin: createDate(p.timestamp),
		end: createMaybeDate(p.timestampEnd),

		device: p as unknown as AdactaTimelineUsage$data,
	}));

	const timelineResources: IResourceEntry[] = device.usageInResource
		.filter(isNonNullish)
		.map((u) => {
			assertDefined(u.begin);
			return {
				itemType: "resource",
				begin: createDate(u.begin),
				end: createMaybeDate(u.end),

				resource: u as unknown as AdactaTimelineResource$data,
			};
		});

	const timelineNotes: INoteEntry[] =
		device.notes?.edges
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

	return (
		<>
			{deviceEditor && <DeviceEdit closeModal={() => setDeviceEditor(false)} device={device} />}
			<TabbedPageLayout
				key={device.id}
				pageHeader={{
					pageTitle: (
						<>
							Device {device.name} <OriginRepoIndicator metadata={device} />
						</>
					),
					rightSideItems: !props.popoverMode
						? [
								<ShowIfUserCanEdit key="edit" metadata={device}>
									<EuiButton iconType="documentEdit" size="s" onClick={() => setDeviceEditor(true)}>
										Edit
									</EuiButton>
								</ShowIfUserCanEdit>,
								<ShowIfUserCanEdit key="assignShortId" metadata={device}>
									{!device.shortId && <AssignShortIdButton deviceId={device.id} size={"s"} />}
								</ShowIfUserCanEdit>,
								<ShowIfUserCanEdit key="delete" metadata={device}>
									<DeviceDelete size="s" device={device} connections={[]} buttonStyle="icon" />
								</ShowIfUserCanEdit>,
						  ]
						: [],
					description: (
						<EuiFlexGroup>
							<EuiFlexItem grow={false}>
								<DeviceImageList device={device} />
							</EuiFlexItem>
							<EuiFlexItem>
								<span>
									{device.shortId && <>Short ID: {device.shortId}</>}
									<br />
									Created by: <UserLink user={device.metadata.creator} /> at{" "}
									<DateTime date={createDate(device.metadata.creationTimestamp)} />
									{device.topLevelDevice && (
										<>
											<br />
											Currently installed in setup: <DeviceLink data={device.topLevelDevice} />
										</>
									)}
									{historyMode && (
										<>
											<span>
												<br />
												Viewing device at <DateTime date={viewTimestamp} />
											</span>{" "}
											<EuiLink
												href="#"
												onClick={() =>
													router.push("/repositories/:repositoryId/devices/:deviceId/", {
														repositoryId: repositoryIdVariable.repositoryId,
														deviceId: device.id,
													})
												}
											>
												Jump to present
											</EuiLink>
										</>
									)}
									<br />
									<ProjectEditorAsHeaderElement data={device} listOnly={popoverMode} />
								</span>
							</EuiFlexItem>
						</EuiFlexGroup>
					),
					tabs: [
						{
							id: "components",
							label: "Components",
							content: (
								<>
									<EuiSpacer />
									{!popoverMode && (
										<>
											<AdactaTimeline
												id={device.id}
												name={device.name}
												samples={timelineSamples}
												components={timelineComponents}
												usages={timelineUsages}
												resources={timelineResources}
												notes={timelineNotes}
												viewTimestamp={viewTimestamp}
												button={
													!props.popoverMode ? (
														<AddNote thingId={device.id} connections={[device.notes.__id]} />
													) : undefined
												}
												notesConnectionId={device.notes.__id}
											/>
										</>
									)}
									<EuiSpacer />
									<ComponentEuiTree
										viewTimestamp={viewTimestamp}
										historyMode={historyMode}
										popoverMode={popoverMode}
										device={device}
									/>
									<EuiSpacer />
									{!popoverMode && (
										<SetupDescriptionComponent
											device={device}
											timestamp={viewTimestamp}
											allowEdit={true}
										/>
									)}
								</>
							),
						},
						...(specification.length > 0
							? [
									{
										id: "specifications",
										label: "Specifications",
										content: (
											<>
												{!props.popoverMode && (
													<ShowIfUserCanEdit metadata={device}>
														<EuiFlexGroup direction={"column"} alignItems={"flexEnd"}>
															<EuiFlexItem>
																<EuiButtonIcon
																	onClick={() => setDeviceEditor(true)}
																	iconType={"pencil"}
																	aria-label={"Edit Specification"}
																/>
															</EuiFlexItem>
														</EuiFlexGroup>
													</ShowIfUserCanEdit>
												)}
												<EuiDescriptionList type="column" listItems={specification} />
											</>
										),
									},
							  ]
							: []),
						...(samples.length > 0
							? [
									{
										id: "samples",
										label: "Samples",
										content: <EuiDescriptionList type="row" listItems={samples} />,
									},
							  ]
							: []),
						{
							id: "activity",
							label: "History",
							content: (
								<>
									{!popoverMode && (
										<>
											<EuiFlexGroup justifyContent={"flexEnd"}>
												<EuiFlexItem grow={false}>
													<AddNote thingId={device.id} connections={[device.notes.__id]} />
												</EuiFlexItem>
											</EuiFlexGroup>
											<EuiSpacer />
										</>
									)}
									<ChangelogWithNotes data={device} />
								</>
							),
						},
						...(!popoverMode && device.usagesAsProperty.length === 0
							? [
									{
										id: "addresources",
										label: "Add Resources",
										content: (
											<EuiFlexGroup justifyContent="center">
												<EuiFlexItem grow={false}>
													{}
													<FileUpload deviceId={device.id as IDeviceId} />
												</EuiFlexItem>
											</EuiFlexGroup>
										),
									},
							  ]
							: []),
					],
				}}
			/>
		</>
	);
}
