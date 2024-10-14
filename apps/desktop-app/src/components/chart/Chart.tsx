import type { LineSeriesStyle, RecursivePartial } from "@elastic/charts";
import {
	Axis,
	Chart as EuiChart,
	LineSeries,
	niceTimeFormatter,
	ScaleType,
	Settings,
	Tooltip,
} from "@elastic/charts";
import { EuiFlexGroup, EuiFlexItem, EuiPanel } from "@elastic/eui";
import React, { Fragment, Suspense } from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { ChartLoading } from "./ChartLoading";
import { ColorAssigner } from "./utils/ColorAssigner";
import { groupMonotonic } from "./utils/groupMonotonic";

import type { ChartFragment$key } from "@/relay/ChartFragment.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";
import type { IDeviceId } from "~/lib/database/Ids";

interface IProps {
	chart: ChartFragment$key;

	customLegend?: JSX.Element;

	/**
	 * List of device IDs which should be hidden
	 */
	hideDevices?: string[];

	/**
	 * Label of the series which should be highlighted (all other series should get a lighter color)
	 */
	highlightSeries?: string;
}

const ChartGraphQLFragment = graphql`
	fragment ChartFragment on Data {
		x {
			label
			unit
			values
			device {
				__typename
			}
		}
		y {
			label
			unit
			values
			device {
				id
			}
			resourceId
		}
	}
`;

export function Chart(props: IProps) {
	const downSampled = useFragment(ChartGraphQLFragment, props.chart);
	const colorAssigner = new ColorAssigner();

	if (downSampled === null) return <div>No preview available</div>;

	const xStart = downSampled.x.values[0];
	const xEnd = downSampled.x.values[downSampled.x.values.length - 1];
	assertDefined(xStart);
	assertDefined(xEnd);

	// Note: The importer doesn't assign a unit or a device to the x-axis if it's a time value
	const xValueIsTime = downSampled.x.unit === "" && downSampled.x.device?.__typename == undefined;

	function identityTickFormatter<T>(value: T) {
		return value;
	}

	// Print time and add date if timeframe is bigger than 24h
	const formatXValue = xValueIsTime ? niceTimeFormatter([xStart, xEnd]) : identityTickFormatter;

	const units: string[] = [];

	const resources: string[] = [];

	const getResourceIndex = (id?: string | null) => {
		assertDefined(id, "Resource Index ID required");
		const index = resources.findIndex((v) => v === id);
		if (index === -1) {
			resources.push(id);
			return resources.length - 1;
		}
		return index;
	};

	const getLineStyleByIndex = (
		index: number,
		bold?: boolean
	): RecursivePartial<LineSeriesStyle> => {
		if (index === 0) {
			return {
				line: {
					strokeWidth: bold ? 2 : 1,
				},
				fit: {
					line: {
						// EUI draws lines to data points that were filled by the "fit" function
						// always only dashed. This behavior is circumvented by setting the
						// individual strokes to infinite length. Such behavior is desired
						// because all data in the chart is already downsampled.
						dash: [Infinity],
					},
				},
			};
		} else {
			const dashConfigs = [
				[1], // Dots
				[5], // Dashes
				[20, 5], // Long-Dash
				[20, 5, 5, 5], // Long-Dash, Short-Dash alternating
			];

			const dashConfigIndex = (index - 1) % dashConfigs.length;
			const dashConfig = dashConfigs[dashConfigIndex];

			return {
				line: {
					dash: dashConfig,
				},
				fit: {
					line: {
						dash: dashConfig,
					},
				},
			};
		}
	};

	const getColor = (axisTitle: string, axisLabel: string) => {
		if (props.highlightSeries !== undefined && props.highlightSeries !== axisLabel) {
			return colorAssigner.getLightColor(axisTitle);
		}

		return colorAssigner.getColor(axisTitle);
	};

	// Construct line series for each y-axis and group by unit
	const lineSeries = downSampled.y.flatMap((yAxis, i) => {
		const axisTitle = `${yAxis.label} (${yAxis.unit})`;
		const axisId = `${axisTitle}${i}`;

		// Request color even for hidden axes to get consistent colors
		const color = getColor(axisTitle, yAxis.label);

		if (yAxis.device?.id !== null && props.hideDevices?.includes(yAxis.device?.id as IDeviceId)) {
			return [];
		}

		units.push(yAxis.unit);

		assertDefined(downSampled);

		const data: { x: number; y: number }[] = [];
		for (let j = 0; j < downSampled.x.values.length; j++) {
			const y = yAxis.values[j];
			const x = downSampled.x.values[j];
			if (y !== null && x !== null) {
				data.push({ x, y });
			}
		}

		// Group into slices of monotonous data
		// This avoids drawing lines between data points that should not be connected
		// (i.e. for measurements where the time is not part of the data and instead an X-axis with
		// potentially repeating values is used)
		const dataSlices = groupMonotonic(data, true);

		return (
			<Fragment key={`${axisTitle}-${i}`}>
				{dataSlices.map((d, j) => {
					return (
						<LineSeries
							key={`${axisTitle}-${i}-${j}`}
							name={axisTitle}
							id={`${axisId}-${j}`}
							data={d}
							color={color}
							xAccessor={"x"}
							yAccessors={["y"]}
							groupId={yAxis.unit}
							xScaleType={xValueIsTime ? ScaleType.Time : ScaleType.Linear}
							lineSeriesStyle={getLineStyleByIndex(
								getResourceIndex(yAxis.resourceId),
								props.highlightSeries !== undefined && props.highlightSeries === yAxis.label
							)}
						/>
					);
				})}
			</Fragment>
		);
	});

	// Setup one axis per unit
	const yAxes = [...new Set(units)].map((unit) => (
		<Axis key={unit} title={unit} id={unit} position="left" groupId={unit} />
	));

	return (
		<Suspense fallback={<ChartLoading />}>
			<EuiPanel hasShadow={false}>
				<EuiFlexGroup>
					<EuiFlexItem>
						<EuiChart size={{ height: 500, width: "100%" }}>
							<Settings showLegend={props.customLegend === undefined} />
							<Tooltip
								headerFormatter={(data) => {
									return <>{formatXValue(data.value)}</>;
								}}
							/>
							<Axis
								id="bottom-axis"
								position="bottom"
								tickFormat={formatXValue}
								title={downSampled.x.label + (downSampled.x.unit ? ` (${downSampled.x.unit})` : "")}
								timeAxisLayerCount={3}
							/>
							{yAxes}
							{lineSeries}
						</EuiChart>
					</EuiFlexItem>
					<EuiFlexItem grow={false}>{props.customLegend}</EuiFlexItem>
				</EuiFlexGroup>
			</EuiPanel>
		</Suspense>
	);
}
