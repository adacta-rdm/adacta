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
import { merge } from "lodash-es";
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
	 * Select a series which should be highlighted (all other series should get a lighter color)
	 */
	highlight?: {
		/**
		 * Name of the series
		 */
		name?: string;

		/**
		 * Resource ID of the series
		 */
		resourceId?: string;
	};
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
		highlight?: boolean
	): RecursivePartial<LineSeriesStyle> => {
		const baseConfig: RecursivePartial<LineSeriesStyle> = {
			// point: resources.length > 1 ? { visible: false } : undefined, // Hide points in comparison charts
			point: { visible: false },
			line: {
				strokeWidth: highlight ? 2 : 1,
			},
		};

		// Use the default line style (solid line) for the first resource and for highlighted resources
		// This ensures that the increased stroke width is easier noticeable
		if (index === 0 || highlight) {
			return merge(baseConfig, {
				fit: {
					line: {
						// EUI draws lines to data points that were filled by the "fit" function
						// always only dashed. This behavior is circumvented by setting the
						// individual strokes to infinite length. Such behavior is desired
						// because all data in the chart is already downsampled.
						dash: [Infinity],
					},
				},
			});
		} else {
			// Syntax is [dashLength, gapLength, dashLength, gapLength, ...]
			const dashConfigs = [
				[1], // Dots
				[5], // Dashes
				[20, 5], // Long-Dash
				[20, 5, 5, 5], // Long-Dash, Short-Dash alternating
			];

			const dashConfigIndex = (index - 1) % dashConfigs.length;
			const dashConfig = dashConfigs[dashConfigIndex];

			return merge(baseConfig, {
				line: {
					dash: dashConfig,
				},
				fit: {
					line: {
						dash: dashConfig,
					},
				},
			});
		}
	};

	const getColor = (resourceId: string | null, axisTitle: string, axisLabel: string) => {
		if (
			props.highlight !== undefined &&
			props.highlight.name !== axisLabel &&
			props.highlight.resourceId !== resourceId
		) {
			return colorAssigner.getLightColor(axisTitle);
		}

		return colorAssigner.getColor(axisTitle);
	};

	// Construct line series for each y-axis and group by unit
	const lineSeries = downSampled.y.flatMap((yAxis, i) => {
		const axisTitle = `${yAxis.label} (${yAxis.unit})`;
		const axisId = `${axisTitle}${i}`;

		// Request color even for hidden axes to get consistent colors
		const color = getColor(yAxis.resourceId, axisTitle, yAxis.label);

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
								props.highlight !== undefined &&
									(props.highlight.name === yAxis.label ||
										props.highlight.resourceId === yAxis.resourceId)
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
