import { Axis, Chart, LineSeries, niceTimeFormatter, Settings } from "@elastic/charts";
import { euiPaletteForLightBackground, EuiStat } from "@elastic/eui";
import {
	EUI_CHARTS_THEME_LIGHT,
	EUI_SPARKLINE_THEME_PARTIAL,
} from "@elastic/eui/dist/eui_charts_theme";
import React from "react";
import { graphql } from "react-relay";
import { useFragment } from "react-relay/hooks";

import { groupMonotonic } from "./utils/groupMonotonic";

import type { Sparkline$key } from "@/relay/Sparkline.graphql";
import { assertDefined } from "~/lib/assert/assertDefined";

const SparklineGraphQLFragment = graphql`
	fragment Sparkline on ResourceTabularData {
		downSampled(dataPoints: 18, singleColumn: true) {
			x {
				label
				unit
				values
			}
			y {
				label
				unit
				values
			}
		}
	}
`;

export function Sparklines(props: { resource: Sparkline$key }) {
	const f = useFragment(SparklineGraphQLFragment, props.resource);

	if (f === null) return <div>No preview available</div>;

	const { downSampled: data } = f;

	if (data == undefined || data.x.values.length == 0) return <div>No preview available</div>;

	// Convert IData to row based format. This should be okay as the data is already down sampled
	const sparklineData = [];
	for (let i = 0; i < data.x.values.length; i++) {
		const x = data.x.values[i];
		const y = data.y[0].values[i];
		if (x !== null && y !== null) {
			sparklineData.push({ x, y });
		}
	}

	const yAxisId = `${data.y[0].label ?? ""} (${data.y[0].unit ?? ""})`;

	const xStart = data.x.values[0];
	const xEnd = data.x.values[data.x.values.length - 1];
	assertDefined(xStart);
	assertDefined(xEnd);

	// Print time and add date if timeframe is bigger than 24h
	const dateFormat = niceTimeFormatter([xStart, xEnd]);

	// Custom label formatter to print only the first and last value
	const firstAndLastTickFormatter = (v: number) =>
		v == data.x.values[0] || v === data.x.values[data.x.values.length - 1] ? dateFormat(v) : "";

	const colors = euiPaletteForLightBackground();
	const theme = [EUI_SPARKLINE_THEME_PARTIAL, EUI_CHARTS_THEME_LIGHT.theme];

	const dataSlices = groupMonotonic(sparklineData, true).map((s) => s.sort((a, b) => a.x - b.x));

	return (
		<EuiStat title="" description="" textAlign="right">
			<Chart size={{ height: 100, width: 200 }}>
				<Settings theme={theme} showLegend={false} />
				{dataSlices.map((slice, i) => (
					<LineSeries
						key={i}
						id={`${yAxisId}-${i}`}
						data={slice}
						color={colors}
						xAccessor={"x"}
						yAccessors={["y"]}
						xScaleType={"linear"}
					/>
				))}
				<Axis ticks={3} title={yAxisId} id="left" position="left" showOverlappingLabels={true} />
				<Axis
					id="bottom-axis"
					position="bottom"
					tickFormat={dateFormat}
					showOverlappingLabels={true}
					labelFormat={firstAndLastTickFormatter}
					gridLine={{ visible: true }}
				/>
			</Chart>
		</EuiStat>
	);
}
