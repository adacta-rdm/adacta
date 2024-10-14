import assert from "assert";

import {
	EuiButton,
	EuiButtonIcon,
	EuiDescriptionList,
	EuiEmptyPrompt,
	EuiFlexGroup,
	EuiFlexItem,
	EuiFormRow,
	EuiIcon,
	EuiPanel,
	EuiPopover,
	EuiSpacer,
	EuiTitle,
	EuiToolTip,
} from "@elastic/eui";
import moment from "moment";
import type { ReactElement } from "react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { graphql } from "react-relay";
import type Timeline from "react-vis-timeline";

import type { TimelineGroup } from "./VisTimeline";
import { VisTimeline } from "./VisTimeline";
import { EDocId } from "../../interfaces/EDocId";
import { useRepoRouterHook } from "../../services/router/RepoRouterHook";
import { propertyNameToReadableString } from "../../utils/PropertyNameToReadableString";
import { InfoHeadline } from "../InfoHeadline";
import { Link } from "../Link";
import { DatePickerRange } from "../datepicker/DatePicker";
import { DateTime } from "../datetime/DateTime";
import { DeviceLink } from "../device/DeviceLink";
import type { IExistingProperty } from "../device/modals/AddOrEditComponentUsageModal";
import { EditComponentUsageModalLazy } from "../device/modals/EditComponentUsageModal";
import { SwapComponentModalLazy } from "../device/modals/SwapComponentModal";
import { NoteWithEditor } from "../note/NoteWithEditor";
import { ResourceLink } from "../resource/ResourceLink";
import { SampleLink } from "../sample/SampleLink";

import type { AdactaTimelineComponents$data } from "@/relay/AdactaTimelineComponents.graphql";
import type { AdactaTimelineNotes$data } from "@/relay/AdactaTimelineNotes.graphql";
import type { AdactaTimelineResource$data } from "@/relay/AdactaTimelineResource.graphql";
import type { AdactaTimelineSample$data } from "@/relay/AdactaTimelineSample.graphql";
import type { AdactaTimelineUsage$data } from "@/relay/AdactaTimelineUsage.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";
import { assertUnreachable } from "~/lib/assert/assertUnreachable";
import { createIDatetime } from "~/lib/createDate";
import { MAX_DATE_INT } from "~/lib/utils/maxDateInt";
import { splitPropertyNameIntoVirtualGroups } from "~/lib/utils/splitPropertyNameIntoVirtualGroups";

graphql`
	fragment AdactaTimelineSample on Sample {
		id
		name
		...SampleLink
	}
`;

graphql`
	fragment AdactaTimelineComponents on Property {
		id
		name
		value {
			__typename
			... on Device {
				id
				name
				...DeviceLink
			}
			... on Sample {
				id
				name
				...SampleLink
			}
		}
	}
`;

graphql`
	fragment AdactaTimelineUsage on Property {
		device {
			id
			name
			...DeviceLink
		}
	}
`;

graphql`
	fragment AdactaTimelineResource on ResourceTimed {
		id
		name
		begin
		end
		...ResourceLink
	}
`;

graphql`
	fragment AdactaTimelineNotes on Note {
		id
		caption
		begin
		end
		...NoteWithEditorFragment
	}
`;

interface ITimelineEntryBase {
	begin: Date;
	end?: Date | null;
}

export interface ISampleEntry extends ITimelineEntryBase {
	itemType: "sample";
	sample: AdactaTimelineSample$data;
	pathFromTopLevelDevice: string[];
}

export interface IComponentEntry extends ITimelineEntryBase {
	itemType: "component";
	property: AdactaTimelineComponents$data;
}

export interface IUsageEntry extends ITimelineEntryBase {
	itemType: "usage";
	device: AdactaTimelineUsage$data;
}

export interface IResourceEntry extends ITimelineEntryBase {
	itemType: "resource";
	resource: AdactaTimelineResource$data;
}

export interface INoteEntry extends ITimelineEntryBase {
	itemType: "note";
	note: AdactaTimelineNotes$data;
}

interface IProps {
	id: string;
	name: string;

	samples?: ISampleEntry[];
	components?: IComponentEntry[];
	usages?: IUsageEntry[];
	resources?: IResourceEntry[];
	notes?: INoteEntry[];

	viewTimestamp?: Date;

	button?: ReactElement;

	options?: {
		/**
		 * If set to false resources are displayed as regular items instead of background areas
		 * Default value: true
		 */
		resourcesAsBackground?: true;
	};

	notesConnectionId?: string;
}

// HTML entity for "⇒"
const ARROW_HTML_ENTITY = "&rArr;";

export function AdactaTimeline(props: IProps) {
	const { repositoryId } = useRepoRouterHook();
	let max = new Date(-MAX_DATE_INT);
	let min = new Date(MAX_DATE_INT);

	const samples = props.samples ?? [];
	const components = props.components ?? [];
	const usages = props.usages ?? [];
	const resources = props.resources ?? [];
	const notes = props.notes ?? [];

	const [selectedItem, setSelectedItem] = useState<ITimelineEntryInfo | undefined>(undefined);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [editComponentModal, setEditComponentModal] = useState<IExistingProperty | undefined>(
		undefined
	);
	const [swapComponentModal, setSwapComponentModal] = useState<string | undefined>(undefined);

	type Item = NonNullable<Timeline["props"]["initialItems"]>[0];
	type GroupedItem = Item & { group: string };

	const resourcesAsBackground = props.options?.resourcesAsBackground ?? true;

	const resourceGroupId = "resource";
	const componentGroupId = "component";
	const usageGroupId = "usage";
	const sampleGroupId = "sample";
	const noteGroupId = "note";

	const subgroupCaptions = new Map<string, string>();

	type ITimelineEntryInfo =
		| IComponentEntry
		| IUsageEntry
		| Omit<ISampleEntry, "pathFromTopLevelDevice">
		| IResourceEntry
		| INoteEntry;

	// Maps a timeline item id to an entry with additional information for the on click handlers
	const idInfoMap = useMemo(() => new Map<string, ITimelineEntryInfo>(), []);

	// Resources are rendered in the background. Background items don't have event handlers.
	// If the user clicks on an item in the background then there is no information about the item
	// in the event. To identify the correct item, it is examined whether the click position
	// (a time on the timeline) falls within an interval in which a resource is located
	const timeInfo: { begin: number; end: number; resource: IResourceEntry }[] = useMemo(
		() => [],
		[]
	);

	// Using memo here to avoid useless changes due to small updates in the current time
	const currentTime = useMemo(() => new Date(), []);

	const updateMinMax = (start: Date, end: Date) => {
		if (start < min) {
			min = start;
		}

		if (end > max) {
			max = end;
		}
	};

	function createSubgroups(elements: { group: string }[]) {
		// Dedupe IDs
		const groupIds = [...new Set(elements.map((c) => c.group))].sort();

		// Create a subgroups
		groups.push(
			...groupIds.map((item) => {
				const maxCaptionSize = 50;
				let caption = subgroupCaptions.get(item) ?? "";
				if (caption.length > maxCaptionSize) {
					caption = `${caption.slice(0, maxCaptionSize / 2)}...${caption.slice(
						caption.length - maxCaptionSize / 2
					)}`;
				}

				return {
					id: item,
					content: caption,
					className: "borderless-subgroup",
				};
			})
		);

		return groupIds;
	}

	function renderItemLink(item: ITimelineEntryInfo): JSX.Element {
		switch (item.itemType) {
			case "component": {
				const value = item.property.value;
				assert(value.__typename !== "%other");
				switch (value.__typename) {
					case "Device":
						return <DeviceLink prependIcon={true} data={value} />;
					case "Sample":
						return <SampleLink prependIcon={true} sample={value} />;
					default:
						assertUnreachable(value);
				}
				break;
			}
			case "usage":
				assertDefined(item.device.device);
				return <DeviceLink prependIcon={true} data={item.device.device} />;
			case "sample":
				return <SampleLink prependIcon={true} sample={item.sample} />;
			case "resource":
				return <ResourceLink prependIcon={true} resource={item.resource} />;
			case "note":
				return (
					<NoteWithEditor
						thingId={props.id}
						note={item.note}
						connections={
							props.notesConnectionId !== undefined ? [props.notesConnectionId] : undefined
						}
						onDelete={() => setSelectedItem(undefined)}
					/>
				);
			default:
				assertUnreachable(item);
		}
	}

	const componentItems: GroupedItem[] = components.map((p) => {
		const { property } = p;
		assert(property.value.__typename !== "%other");
		updateMinMax(p.begin, p.end ?? currentTime);

		const id = `component_${props.id}_${property.name}_${property.value.id}_${p.begin.getTime()}`;
		idInfoMap.set(id, {
			itemType: "component",
			property: property,
			begin: p.begin,
			end: p.end,
		});

		// Extract virtual groups from property name
		const virtualGroups = splitPropertyNameIntoVirtualGroups([
			propertyNameToReadableString(property.name),
		]);

		const groupId = componentGroupId + property.name + virtualGroups.join(".");
		subgroupCaptions.set(groupId, virtualGroups.join(` ${ARROW_HTML_ENTITY} `));

		return {
			id,
			group: groupId,
			start: p.begin,
			end: p.end ?? undefined,
			content: property.value.name,
			className: property.value.__typename === "Device" ? "vis-item-device" : "vis-item-sample",
		};
	});

	const usageItems: Item[] = usages.flatMap((p) => {
		if (p.device.device === null) {
			return [];
		}

		updateMinMax(p.begin, p.end ?? currentTime);

		const id = `usage_${props.id}_${p.device.device.id}_${p.begin.getTime()}`;
		idInfoMap.set(id, {
			itemType: "usage",
			device: p.device,
			begin: p.begin,
			end: p.end,
		});
		return {
			id,
			group: usageGroupId,
			start: p.begin,
			end: p.end ?? undefined,
			content: `${props.name} used in ${p.device.device.name}`,
			className: "vis-item-device",
		};
	});

	const sampleItems: GroupedItem[] = samples.map((p) => {
		updateMinMax(p.begin, p.end ?? currentTime);

		const id = `sample_${props.id}_${p.sample.id}_${p.begin.getTime()}`;
		idInfoMap.set(id, { itemType: "sample", sample: p.sample, begin: p.begin, end: p.end });

		const groupId = p.pathFromTopLevelDevice.join(".");

		// Render group caption like this "Furnace ⇒ Reactor ⇒ Sample" (sample within a reactor
		subgroupCaptions.set(groupId, p.pathFromTopLevelDevice.join(` ${ARROW_HTML_ENTITY} `));

		return {
			id,
			group: groupId,
			start: p.begin,
			end: p.end ?? undefined,
			content: p.sample.name,
			className: "vis-item-sample",
		};
	});

	const noteItems: Item[] = notes.map((n) => {
		updateMinMax(n.begin, n.end ?? currentTime);
		const id = n.note.id;
		const caption = n.note.caption;

		assertDefined(id);
		assertDefined(caption);

		idInfoMap.set(id, { ...n, itemType: "note" });

		return {
			type: n.end ? "range" : "box",
			id,
			content: caption,
			start: n.begin,
			end: n.end ?? undefined,
			group: noteGroupId,
		};
	});

	const resourceItems: Item[] = resources.map((r) => {
		updateMinMax(r.begin, r.end ?? currentTime);
		assertDefined(r.end);

		const resource: IResourceEntry = {
			itemType: "resource",
			resource: r.resource,
			begin: r.begin,
			end: r.end,
		};
		const id = r.resource.id;

		let options = {};
		if (resourcesAsBackground) {
			// If resource is in background put details into time based map
			timeInfo.push({
				begin: r.begin.getTime(),
				end: r.end.getTime(),
				resource,
			});
		} else {
			const groupId = usageGroupId + r.resource.id;
			subgroupCaptions.set(groupId, r.resource.name);
			options = { group: groupId, className: "vis-item-resource" };

			// If resource is not in background put details into id based map
			idInfoMap.set(id, resource);
		}

		const background: Item = {
			id: id,
			content: r.resource.name,
			start: r.begin,
			end: r.end,
			type: resourcesAsBackground ? "background" : "range",
			...options,
		};

		return background;
	});

	const groups: TimelineGroup[] = [];
	if (usageItems.length) {
		groups.push({ id: usageGroupId, content: "Usages" });
	}

	if (componentItems.length) {
		const groupIds = createSubgroups(componentItems);
		groups.push({ id: componentGroupId, content: "Components", nestedGroups: groupIds });
	}

	if (sampleItems.length) {
		const groupIds = createSubgroups(sampleItems);
		groups.push({ id: sampleGroupId, content: "Samples", nestedGroups: groupIds });
	}

	if (noteItems.length) {
		groups.push({ id: noteGroupId, content: "Events" });
	}

	if (resourceItems.length) {
		if (!resourcesAsBackground) {
			const groupIds = createSubgroups(resourceItems as GroupedItem[]);
			groups.push({ id: resourceGroupId, content: "Resources", nestedGroups: groupIds });
		} else {
			groups.push({ id: resourceGroupId, content: "Resources" });
		}
	}

	// If the timeline consist of only one item (with a single start date) the window will become
	// super small. To get a reasonable scale the single point is taken as center and
	// some time is added to both sides.
	if (min == max) {
		const halfADayMs = 12 * 60 * 1000;
		min = new Date(new Date(min).getTime() - halfADayMs);
		max = new Date(new Date(max).getTime() + halfADayMs);
	}

	// Add small buffer in front of the first element and after the last element
	const minMs = min.getTime();
	const maxMs = max.getTime();
	const buffer = 0.1 * (maxMs - minMs);
	const initialWindowMin = useMemo(() => new Date(minMs - buffer), [minMs, buffer]);
	const initialWindowMax = useMemo(() => new Date(maxMs + buffer), [maxMs, buffer]);

	const options: Timeline["props"]["options"] = {
		width: "100%",

		// If groupHeightMode is set to 'fitItems' the height will be calculated based on the
		// visible items only.
		// This avoids unnecessary high groups and thus puts the same components/samples on the same
		// height.
		groupHeightMode: "fitItems",

		// The component is initialized with min/max value which limit the view area.
		// These limits are then removed in the useEffect hook.
		// Without these artificial initial limits the window gets moved to now on 2nd/3rd render.
		min: initialWindowMin,
		max: initialWindowMax,

		// Forbids zooming in further than 1 minute.
		zoomMin: 1000 * 60, // 1min in ms

		// Forbids zooming out further than ~5 years.
		zoomMax: 1000 * 60 * 60 * 24 * 365 * 5, // ~5 years in ms

		// Disable stacking since collisions are avoided by separate groups
		stack: false,

		showCurrentTime: false,

		// Improve zoom
		horizontalScroll: true,
		verticalScroll: true,
		zoomKey: "ctrlKey",
	};

	const findBackgroundInfoByClickPosition = useCallback(
		(time: Date) => {
			// Try to match resource by position of click on timeline
			for (const resourceItem of timeInfo) {
				if (resourceItem.begin < time.getTime() && resourceItem.end > time.getTime()) {
					return resourceItem.resource;
				}
			}
		},
		[timeInfo]
	);

	const ref = useRef<Timeline>(null);

	// Simulates .focus() for a time range instead of a item ID
	const simulateFocus = useCallback(
		(beginDate: Date, endDate: Date) => {
			const end = endDate.getTime();
			const begin = beginDate.getTime();
			const diff = end - begin;
			const buffer = 0.05 * diff;

			ref.current?.timeline.setWindow(begin - buffer, end + buffer);
		},
		[ref]
	);

	const onDoubleClick = useCallback(
		({ item, time }: { item: string; time: Date }) => {
			if (item == null) {
				// If there is no item then the user has either clicked on nothing or on a background
				// area. Lookup click position to find out if the user clicked onto a background area.
				const item = findBackgroundInfoByClickPosition(time);
				if (item) {
					const { begin, end } = item.resource;
					assertDefined(begin);
					assertDefined(end);
					simulateFocus(new Date(begin), new Date(end));
				}
			}

			ref.current?.timeline.focus(item);
		},
		[findBackgroundInfoByClickPosition, simulateFocus, ref]
	);

	const onClick = useCallback(
		(event: { item: string; time: Date }) => {
			// Try to find event by ID
			let info = idInfoMap.get(event.item);

			if (!info) {
				// Try to match resource by position of click on timeline
				info = findBackgroundInfoByClickPosition(event.time);

				if (!info) {
					return;
				}
			}

			setSelectedItem(info);
		},
		[findBackgroundInfoByClickPosition, idInfoMap]
	);

	useEffect(() => {
		if (ref.current) {
			const height = groups.length < 4 ? groups.length * 100 : 400;

			// Restrict height + unlock window limits (zoom, range)
			ref.current.timeline.setOptions({
				// Using hardcoded height causes issues the timeline view to stay empty on the first
				// render until some interaction happens.
				// Using maxHeight does cause the size to jump back and forth briefly when first
				// loading but the final result is correct at least.
				maxHeight: `${String(height)}px`,
				min: new Date(-MAX_DATE_INT),
				max: new Date(MAX_DATE_INT),
			});
			// Move initial window
			ref.current.timeline.setWindow(initialWindowMin, initialWindowMax);

			// Register double click handler
			ref.current.timeline.on("doubleClick", onDoubleClick);

			// Register single click handler
			ref.current.timeline.on("click", onClick);
		}
	}, [ref, initialWindowMin, initialWindowMax, onClick, onDoubleClick, groups.length]);

	const [startDate, setStartDate] = useState(initialWindowMin);
	const [endDate, setEndDate] = useState(initialWindowMax);

	const settingsPanel = (
		<>
			<EuiFormRow label="Restore initial window position">
				<EuiButton
					size="s"
					onClick={() => {
						ref.current?.timeline.setWindow(initialWindowMin, initialWindowMax);
						setStartDate(initialWindowMin);
						setEndDate(initialWindowMax);
					}}
				>
					Reset zoom and position
				</EuiButton>
			</EuiFormRow>
			{/*Using EuiDatePickerRange did not work with "Use current time" link, because the height of the parent component did not increase*/}
			<EuiFormRow label="Change timeline range">
				<DatePickerRange
					startDate={moment(startDate)}
					endDate={moment(endDate)}
					rangeValueStart={startDate}
					rangeValueEnd={endDate}
					onChangeRangeStart={(e) => {
						setStartDate(e);
						ref.current?.timeline.setWindow(e, endDate);
					}}
					onChangeRangeEnd={(e) => {
						setEndDate(e);
						ref.current?.timeline.setWindow(startDate, e);
					}}
					minDate={moment(initialWindowMin)}
					maxDate={moment(initialWindowMax)}
				/>
			</EuiFormRow>
		</>
	);

	const gearButton = (
		<EuiToolTip content={"Rescale timeline"}>
			<EuiButtonIcon
				iconType="gear"
				iconSize={"s"}
				aria-label={"Timeline settings"}
				// Note: It is important to disable this button when no elements are shown in the
				// timeline, since it is not possible to calculate a proper window range in that case.
				onClick={() => setSettingsOpen(true)}
				disabled={groups.length == 0}
			/>
		</EuiToolTip>
	);

	function getTimestampText(selectedItemTime: Date | undefined) {
		if (props.viewTimestamp?.getTime() === selectedItemTime?.getTime()) {
			return (
				<EuiToolTip content="The link is disabled because the device view is at the selected device starting or ending timestamp.">
					<DateTime date={selectedItemTime} undefinedMeansNow />
				</EuiToolTip>
			);
		}

		const params = {
			repositoryId,
			deviceId: props.id,
		};

		if (selectedItemTime) {
			return (
				<Link
					to={[
						"/repositories/:repositoryId/devices/:deviceId/:deviceTimestamp",
						{ ...params, deviceTimestamp: createIDatetime(selectedItemTime) },
					]}
				>
					<DateTime date={selectedItemTime} undefinedMeansNow />
				</Link>
			);
		}

		return (
			<Link to={["/repositories/:repositoryId/devices/:deviceId/", params]}>
				<DateTime date={selectedItemTime} undefinedMeansNow />
			</Link>
		);
	}

	let selectedInfo = null;
	if (selectedItem) {
		const showComponentEditor = () => {
			if (selectedItem.itemType === "component") {
				assert(selectedItem.property.value.__typename !== "%other");
				setEditComponentModal({
					propertyId: selectedItem.property.id,
					slot: selectedItem.property.name,
					component: selectedItem.property.value.id,
					begin: selectedItem.begin,
					end: selectedItem.end === null ? undefined : selectedItem.end,
				});
			}
		};

		const focusItemButton = (
			<EuiToolTip content="Zoom in and center around this item">
				<EuiIcon
					type={"crosshairs"}
					onClick={() => {
						simulateFocus(selectedItem.begin, selectedItem.end ?? currentTime);
					}}
				/>
			</EuiToolTip>
		);

		// construct the time stamp text with links or just text, as appropriate for the device view at the present timestamp
		// For notes: If selectedItem.end is undefined than the end date should not be printed
		const timeStampText = (
			<>
				{getTimestampText(selectedItem.begin)}{" "}
				{selectedItem.itemType !== "note" || selectedItem.end !== undefined ? (
					<>- {getTimestampText(selectedItem.end ?? undefined)}</>
				) : null}
			</>
		);

		selectedInfo = (
			<EuiDescriptionList
				listItems={[
					{
						title: selectedItem.itemType !== "note" ? "Name" : "",
						description: renderItemLink(selectedItem),
					},
					...(selectedItem.itemType === "component"
						? [
								{
									title: "Usage Editor",
									description: (
										<EuiFlexGroup>
											<EuiFlexItem>
												<EuiButton onClick={showComponentEditor}>Edit Usage</EuiButton>
											</EuiFlexItem>
											<EuiFlexItem>
												<EuiButton onClick={() => setSwapComponentModal(selectedItem.property.id)}>
													Swap device
												</EuiButton>
											</EuiFlexItem>
										</EuiFlexGroup>
									),
								},
						  ]
						: []),
					{
						title:
							selectedItem.itemType !== "note" || selectedItem.end !== undefined ? (
								<>Timeframe {focusItemButton}</>
							) : (
								<>Time</>
							),
						description: <>{timeStampText}</>,
					},
				]}
			/>
		);
	}

	return (
		<>
			{editComponentModal && (
				<EditComponentUsageModalLazy
					deviceId={props.id}
					viewDeviceId={props.id}
					onClose={() => setEditComponentModal(undefined)}
					existingProperty={editComponentModal}
					viewTimestamp={props.viewTimestamp}
				/>
			)}
			{swapComponentModal && (
				<SwapComponentModalLazy
					deviceId={props.id}
					viewDeviceId={props.id}
					onClose={() => setSwapComponentModal(undefined)}
					viewTimestamp={props.viewTimestamp}
					propertyId={swapComponentModal}
				/>
			)}
			<EuiFlexGroup>
				<EuiFlexItem grow={true}>
					<InfoHeadline
						name="Timeline"
						docId={EDocId.TIMELINE}
						extraElementsLeft={[
							<EuiPopover
								key="popover"
								button={gearButton}
								isOpen={settingsOpen}
								closePopover={() => setSettingsOpen(false)}
							>
								{settingsPanel}
							</EuiPopover>,
						]}
					/>
				</EuiFlexItem>
				<EuiFlexItem grow={false}>{props.button ? props.button : null}</EuiFlexItem>
			</EuiFlexGroup>

			<EuiSpacer size="s" />
			<EuiPanel>
				{groups.length > 0 ? (
					<VisTimeline
						timelineRef={ref}
						options={options}
						items={[
							...componentItems,
							...usageItems,
							...sampleItems,
							...noteItems,
							...resourceItems,
						]}
						groups={groups}
					/>
				) : (
					<EuiEmptyPrompt
						title={<h2>No history information available</h2>}
						titleSize="xs"
						body={
							<p>
								Place this item in a device or add an event and the information will appear here.
							</p>
						}
					/>
				)}

				{selectedInfo && (
					<EuiFlexGroup alignItems="center" direction="column">
						<EuiFlexItem grow={false} style={{ width: 300 }}>
							<EuiTitle size="s">
								<h5>Selected Item</h5>
							</EuiTitle>
							{selectedInfo}
						</EuiFlexItem>
					</EuiFlexGroup>
				)}
			</EuiPanel>
		</>
	);
}
