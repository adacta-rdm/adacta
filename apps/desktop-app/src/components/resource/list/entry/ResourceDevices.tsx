import {
	EuiDescriptionList,
	EuiDescriptionListDescription,
	EuiDescriptionListTitle,
	EuiFlexGroup,
	EuiLink,
	EuiPopover,
} from "@elastic/eui";
import { groupBy } from "lodash";
import { uniqBy } from "lodash-es";
import upperFirst from "lodash-es/upperFirst";
import { useState } from "react";
import { graphql, useFragment } from "react-relay";

import { DeviceLink } from "../../../device/DeviceLink";

import type { DeviceLink$key } from "@/relay/DeviceLink.graphql";
import type { ResourceDevicesFragment$key } from "@/relay/ResourceDevicesFragment.graphql";

// Number of different devices which will be shown initially (without having to expand)
const INITIAL_DEVICE_COUNT = 2;

export function ResourceDevices(props: { devices: ResourceDevicesFragment$key }) {
	const [exapanded, setExapanded] = useState(false);
	const data = useFragment(
		graphql`
			fragment ResourceDevicesFragment on Device @relay(plural: true) {
				id
				definition {
					acceptsUnit
				}
				...DeviceLink
			}
		`,
		props.devices
	);

	// Make sure every device get's only listed one
	// TODO: Indicate if multiple columns are recorded?
	const unique = uniqBy(data, (d) => d.id);

	// Group by unit kind
	const grouped = Object.values(groupBy(unique, (d) => d.definition.acceptsUnit));

	const selection = exapanded ? grouped : grouped.slice(0, INITIAL_DEVICE_COUNT);

	return (
		<>
			{selection.map((g, index) => (
				<GroupedByDevice
					key={index}
					acceptsUnit={g[0].definition.acceptsUnit}
					devices={g}
					compact={false}
				/>
			))}
			{!exapanded && grouped.length !== selection.length && (
				<EuiLink color={"subdued"} onClick={() => setExapanded(true)}>
					Show {grouped.length - selection.length} more Devices
				</EuiLink>
			)}
		</>
	);
}

function GroupedByDevice(props: {
	compact: boolean;
	acceptsUnit: readonly string[];
	devices: DeviceLink$key[];
}) {
	const [showOthers, setShowOthers] = useState(false);
	const units = [...new Set(props.acceptsUnit)];
	const groupCaption = units.map(getNiceUnitName).join(" + ");

	const devices = props.devices;

	const mainDevice = devices[0]; // First device (always shown)
	const otherDevices = devices.slice(1); // Other devices (hidden by default)

	return (
		<EuiDescriptionList type={props.compact ? "responsiveColumn" : "row"}>
			<EuiDescriptionListTitle>
				<small>{groupCaption}</small>
			</EuiDescriptionListTitle>
			<EuiDescriptionListDescription>
				<DeviceLink data={mainDevice} />{" "}
				{otherDevices.length == 1 && (
					<>
						and <DeviceLink key={2} data={otherDevices[0]} />
					</>
				)}
				{otherDevices.length > 1 && (
					<EuiPopover
						button={
							<>
								and{" "}
								<EuiLink onClick={() => setShowOthers(!showOthers)}>
									{otherDevices.length} others
								</EuiLink>
							</>
						}
						isOpen={showOthers}
						closePopover={() => setShowOthers(false)}
					>
						<EuiFlexGroup>
							{otherDevices.map((d, index) => (
								<DeviceLink key={index} data={d} />
							))}
						</EuiFlexGroup>
					</EuiPopover>
				)}
			</EuiDescriptionListDescription>
		</EuiDescriptionList>
	);
}

function getNiceUnitName(unit: string) {
	return upperFirst(unit.replace(/_/g, " "));
}
