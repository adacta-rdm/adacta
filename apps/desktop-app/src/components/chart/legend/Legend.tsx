import { EuiButton, EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiSpacer } from "@elastic/eui";
import { useDebounceCallback } from "@react-hook/debounce";
import { groupBy } from "lodash-es";
import React from "react";
import { graphql, useFragment } from "react-relay";

import type { LegendFragment$key } from "@/relay/LegendFragment.graphql";
import { LegendContextMenu } from "~/apps/desktop-app/src/components/chart/legend/LegendContextMenu";
import { LegendDot } from "~/apps/desktop-app/src/components/chart/legend/LegendDot";
import { DeviceLink } from "~/apps/desktop-app/src/components/device/DeviceLink";

interface ILegendTreeNode {
	id: string;
	label: JSX.Element;
	children?: ILegendTreeNode[];
}

interface IProps {
	items: ILegendTreeNode[];
}

export function Legend({
	legendInformation,
	getColor,
	show,
	showAll,
	solo,
	hide,
	highlightSeries,
	hideDevices,
}: {
	legendInformation: LegendFragment$key;
	getColor: (label: string) => string;

	show?: (id: string) => void;
	showAll?: () => void;
	solo?: (id: string) => void;
	hide?: (id: string) => void;

	highlightSeries?: (id: string | undefined) => void;

	hideDevices: string[];
}) {
	const highlightSeriesDebounced = useDebounceCallback(highlightSeries ?? (() => {}), 100);

	const yColumns = useFragment(
		graphql`
			fragment LegendFragment on Data {
				y {
					device {
						id
						name
						...DeviceLink
					}
					label
				}
			}
		`,
		legendInformation
	);

	if (yColumns === null) {
		return <></>;
	}

	const legendInformation2 = yColumns.y.map((y) => ({
		device: y.device,
		label: y.label,
		color: getColor(y.label),
	}));
	const legendInformationGrouped = Object.entries(groupBy(legendInformation2, (l) => l.device?.id));

	return (
		<>
			{hideDevices?.length > 0 && (
				<>
					<EuiButton
						size={"s"}
						onClick={() => {
							if (showAll) {
								showAll();
							}
						}}
					>
						Show all devices
					</EuiButton>
					<EuiSpacer />
				</>
			)}
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
										<LegendContextMenu deviceId={device.id} show={show} solo={solo} hide={hide} />
									</EuiFlexItem>
									{hide && (
										<EuiFlexItem grow={false}>
											<EuiButtonIcon
												aria-label={`Hide ${device.name}`}
												iconType={"eyeClosed"}
												onClick={() => {
													hide(device.id);
												}}
											/>
										</EuiFlexItem>
									)}
								</EuiFlexGroup>
							</EuiFlexItem>
						</EuiFlexGroup>
					);

					if (hideDevices?.includes(device.id)) {
						return [];
					}

					return {
						id: device.id,
						label: deviceHeadline,
						children: l.map((c) => ({
							id: `${device.id}${c.label}`,
							label: (
								<EuiFlexGroup
									onPointerEnter={
										highlightSeries ? () => highlightSeriesDebounced(c.label) : undefined
									}
									onPointerLeave={
										highlightSeries ? () => highlightSeriesDebounced(undefined) : undefined
									}
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
		</>
	);
}

function LegendTree(props: IProps) {
	return (
		<ul>
			{props.items.map((n) => (
				<li key={n.id}>
					{n.label}
					{n.children && n.children?.length > 0 && (
						<ul>
							<li>
								<LegendTree items={n.children} />
							</li>
						</ul>
					)}
				</li>
			))}
		</ul>
	);
}
