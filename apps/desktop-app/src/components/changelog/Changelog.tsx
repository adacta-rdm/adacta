import {
	EuiEmptyPrompt,
	EuiFlexGroup,
	EuiFlexItem,
	EuiHorizontalRule,
	EuiSplitPanel,
	EuiTimeline,
	EuiTimelineItem,
} from "@elastic/eui";
import React from "react";
import { graphql, useFragment } from "react-relay";
import type { ArrayElement } from "type-fest/source/internal";

import { RoundedIcon } from "./RoundedIcon";
import { DateTime } from "../datetime/DateTime";
import { DeviceLink } from "../device/DeviceLink";
import { SampleLink } from "../sample/SampleLink";

import type { Changelog$key } from "@/relay/Changelog.graphql";
import { DevicePreviewImage } from "~/apps/desktop-app/src/components/device/DevicePreviewImage";
import { assertDefined } from "~/lib/assert/assertDefined";
import { createDate } from "~/lib/createDate";

const ChangelogFragmentGraphql = graphql`
	fragment Changelog on Node {
		__typename
		... on Sample {
			# This sample is used by these (directly and indirectly?)
			devices {
				timestamp
				timestampEnd
				device {
					...DeviceLink
				}
			}
		}
		... on Device {
			# This device is used by these
			# Alias needed to avoid clashes with other components which call usagesAsProperty with
			# different arguments
			usagesAsProperty(timeFrame: { begin: null, end: null }) {
				name
				timestamp
				timestampEnd
				device {
					...DevicePreviewImage
					...DeviceLink
				}
			}
			# This device uses these
			properties {
				timestamp
				timestampEnd
				name
				value {
					... on Sample {
						__typename
						...SampleLink
					}
					... on Device {
						__typename
						...DevicePreviewImage
						...DeviceLink
					}
				}
			}
		}
	}
`;

interface IEventDescription {
	time: Date;

	info: {
		icon: string | JSX.Element;
		image?: string;
		children: JSX.Element;
	};
}

export function Changelog(props: { data: Changelog$key; additionalEvents?: IEventDescription[] }) {
	const data = useFragment(ChangelogFragmentGraphql, props.data);
	const events: IEventDescription[] = props.additionalEvents ?? [];

	const colorSwaps = "lightShade";
	const colorUsages = "mediumShade";

	if (data.__typename === "Device") {
		const getPropertyInsertionOrRemoval = (
			property: ArrayElement<typeof data.properties>,
			direction: "inserted" | "removed"
		) => {
			if (property.value.__typename === "Device") {
				return (
					<EuiFlexGroup alignItems={"center"}>
						<DevicePreviewImage data={property.value} asFlexItem />
						<EuiFlexItem grow={false}>
							<div style={{ display: "inline-block" }}>
								<DeviceLink data={property.value} /> was{" "}
								{direction === "inserted" ? "inserted into slot" : "removed from"} &lsquo;
								{property.name}
								&rsquo;
							</div>
						</EuiFlexItem>
					</EuiFlexGroup>
				);
			} else if (property.value.__typename === "Sample") {
				return (
					<EuiFlexGroup alignItems={"center"}>
						<EuiFlexItem grow={false}>
							<div style={{ display: "inline-block" }}>
								<SampleLink sample={property.value} /> was{" "}
								{direction === "inserted" ? "inserted into slot" : "removed from"} &lsquo;
								{property.name}
								&rsquo;
							</div>
						</EuiFlexItem>
					</EuiFlexGroup>
				);
			} else {
				throw new Error("Unknown type of property");
			}
		};

		for (const usageAsProperty of data.usagesAsProperty) {
			if (usageAsProperty.device == null) {
				continue;
			}

			// Begin
			events.push({
				time: createDate(usageAsProperty.timestamp),
				info: {
					icon: <RoundedIcon iconType={"importAction"} color={colorUsages} />,
					children: (
						<>
							Device is inserted into slot &lsquo;{usageAsProperty.name}
							&rsquo; of <DeviceLink data={usageAsProperty.device} />
						</>
					),
				},
			});
			if (usageAsProperty.timestampEnd) {
				// End
				events.push({
					time: createDate(usageAsProperty.timestampEnd),
					info: {
						icon: <RoundedIcon iconType={"exportAction"} color={colorUsages} />,
						children: (
							<>
								Device is removed from slot &lsquo;{usageAsProperty.name}
								&rsquo; of <DeviceLink data={usageAsProperty.device} />
							</>
						),
					},
				});
			}
		}

		for (const property of data.properties) {
			// Begin
			events.push({
				time: createDate(property.timestamp),
				info: {
					icon: <RoundedIcon iconType={"insert"} color={colorSwaps} />,
					children: getPropertyInsertionOrRemoval(property, "inserted"),
				},
			});

			// End
			if (property.timestampEnd) {
				events.push({
					time: createDate(property.timestampEnd),
					info: {
						icon: <RoundedIcon iconType={"remove"} color={colorSwaps} />,
						children: getPropertyInsertionOrRemoval(property, "removed"),
					},
				});
			}
		}
	} else if (data.__typename === "Sample") {
		for (const device of data.devices) {
			assertDefined(device.device);
			// Begin
			events.push({
				time: createDate(device.timestamp),
				info: {
					icon: <RoundedIcon iconType={"importAction"} color={colorUsages} />,
					children: (
						<>
							Sample got inserted into <DeviceLink data={device.device} />
						</>
					),
				},
			});
			if (device.timestampEnd) {
				// Begin
				events.push({
					time: createDate(device.timestampEnd),
					info: {
						icon: <RoundedIcon iconType={"exportAction"} color={colorUsages} />,
						children: (
							<>
								Sample got removed from <DeviceLink data={device.device} />
							</>
						),
					},
				});
			}
		}
	}

	if (!events.length) {
		return <EuiEmptyPrompt iconType="cloudDrizzle" body={<p>No history yet.</p>} />;
	}

	return (
		<EuiTimeline>
			{events
				.sort((e1, e2) => e2.time.getTime() - e1.time.getTime())
				.map((e, i) => (
					<EuiTimelineItem icon={e.info.icon} key={i} verticalAlign={"top"}>
						<EuiSplitPanel.Outer color="transparent" hasBorder grow>
							<EuiSplitPanel.Inner color="subdued">
								<b>
									<DateTime date={e.time} />
								</b>
							</EuiSplitPanel.Inner>
							<EuiHorizontalRule margin="none" />
							<EuiSplitPanel.Inner>{e.info.children}</EuiSplitPanel.Inner>
						</EuiSplitPanel.Outer>
					</EuiTimelineItem>
				))}
		</EuiTimeline>
	);
}
