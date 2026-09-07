import { Axis, Grid, LineSeries, Tooltip, XYChart, buildChartTheme } from "@visx/xychart";

export type TimeSeriesPoint = {
	time: Date;
	value: number;
};

export type TimeSeries = {
	label: string;
	color: string;
	data: TimeSeriesPoint[];
	strokeDasharray?: string;
};

const timeFormatter = new Intl.DateTimeFormat("en-US", {
	hour: "2-digit",
	minute: "2-digit",
	hour12: false,
	timeZone: "UTC",
});

const chartTheme = buildChartTheme({
	backgroundColor: "transparent",
	colors: ["var(--adacta-color-series-1)"],
	gridColor: "var(--adacta-color-border)",
	gridColorDark: "var(--adacta-color-border-strong)",
	tickLength: 4,
	svgLabelBig: {
		fill: "var(--adacta-color-foreground)",
		fontFamily: "Inter Variable, sans-serif",
		fontSize: 12,
	},
	svgLabelSmall: {
		fill: "var(--adacta-color-foreground-muted)",
		fontFamily: "Inter Variable, sans-serif",
		fontSize: 11,
	},
});

export function TimeSeriesChart({
	label,
	unit,
	series,
}: {
	label: string;
	unit: string;
	series: TimeSeries[];
}) {
	return (
		<section className="rounded-xl border border-border bg-surface p-5">
			<div className="flex items-baseline justify-between gap-4">
				<h2 className="font-semibold text-foreground">{label}</h2>
				<span className="text-sm text-foreground-muted">{unit}</span>
			</div>

			{series.length > 1 && (
				<ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground-muted">
					{series.map(({ color, label: seriesLabel, strokeDasharray }) => (
						<li key={seriesLabel} className="flex items-center gap-2">
							<svg aria-hidden="true" className="h-2 w-6" viewBox="0 0 24 8">
								<line
									x1="0"
									y1="4"
									x2="24"
									y2="4"
									stroke={color}
									strokeWidth="2"
									strokeDasharray={strokeDasharray}
								/>
							</svg>
							{seriesLabel}
						</li>
					))}
				</ul>
			)}

			<div className="mt-4 h-72 min-w-0">
				<XYChart
					accessibilityLabel={`${label} over time`}
					xScale={{ type: "time" }}
					yScale={{ type: "linear", nice: true, zero: false }}
					margin={{ top: 12, right: 20, bottom: 42, left: 54 }}
					theme={{ ...chartTheme, colors: series.map(({ color }) => color) }}
				>
					<Grid columns={false} numTicks={5} />
					<Axis
						orientation="bottom"
						numTicks={5}
						tickFormat={(value) => timeFormatter.format(value as Date)}
					/>
					<Axis orientation="left" numTicks={5} />
					{series.map(({ data, label: seriesLabel, strokeDasharray }) => (
						<LineSeries
							key={seriesLabel}
							dataKey={seriesLabel}
							data={data}
							xAccessor={(point) => point.time}
							yAccessor={(point) => point.value}
							strokeDasharray={strokeDasharray}
						/>
					))}
					<Tooltip<TimeSeriesPoint>
						snapTooltipToDatumX
						showVerticalCrosshair
						showSeriesGlyphs
						style={{
							background: "var(--adacta-color-surface)",
							border: "1px solid var(--adacta-color-border)",
							color: "var(--adacta-color-foreground)",
						}}
						renderTooltip={({ tooltipData }) => {
							const nearestPoint = tooltipData?.nearestDatum?.datum;
							if (!nearestPoint) return null;

							return (
								<div className="text-sm">
									<div className="font-semibold">{timeFormatter.format(nearestPoint.time)} UTC</div>
									{series.map(({ color, label: seriesLabel }) => {
										const point = tooltipData?.datumByKey?.[seriesLabel]?.datum;
										if (!point) return null;

										return (
											<div key={seriesLabel} className="mt-1 flex justify-between gap-4">
												<span className="flex items-center gap-2">
													<span
														aria-hidden="true"
														className="size-2 rounded-full"
														style={{ backgroundColor: color }}
													/>
													{seriesLabel}
												</span>
												<span className="font-medium">
													{point.value} {unit}
												</span>
											</div>
										);
									})}
								</div>
							);
						}}
					/>
				</XYChart>
			</div>
		</section>
	);
}
