import { ParentSize } from "@visx/responsive";
import { Axis, Grid, LineSeries, Tooltip, XYChart, buildChartTheme } from "@visx/xychart";

export type TimeSeriesPoint = {
	time: Date;
	value: number | null;
};

export type TimeSeries = {
	id?: string;
	label: string;
	color: string;
	data: TimeSeriesPoint[];
	strokeDasharray?: string;
	comparisonKey?: string;
	comparisonLabel?: string;
	role?: "measurement" | "setpoint";
};

/**
 * Compare values only when both series record the same timestamp.
 */
export function measurementComparisons(series: TimeSeries[], time: Date) {
	return series.flatMap((measurement) => {
		if (measurement.role !== "measurement" || !measurement.comparisonKey) return [];
		const setpoint = series.find(
			(candidate) =>
				candidate.role === "setpoint" && candidate.comparisonKey === measurement.comparisonKey,
		);
		if (!setpoint) return [];
		const measuredPoint = measurement.data.find((point) => point.time.getTime() === time.getTime());
		const setpointPoint = setpoint.data.find((point) => point.time.getTime() === time.getTime());
		if (
			measuredPoint?.value === null ||
			setpointPoint?.value === null ||
			!measuredPoint ||
			!setpointPoint
		)
			return [];
		return [
			{
				label: measurement.comparisonLabel ?? measurement.label,
				value: measuredPoint.value - setpointPoint.value,
			},
		];
	});
}

function formatDifference(value: number, unit: string) {
	return `${value > 0 ? "+" : ""}${value.toLocaleString(undefined, { maximumSignificantDigits: 6 })}${unit ? ` ${unit}` : ""}`;
}

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
	gasName,
	series,
	timeZone = "UTC",
	headingLevel = "h2",
}: {
	label: string;
	unit: string;
	gasName?: string | null;
	series: TimeSeries[];
	timeZone?: string;
	headingLevel?: "h2" | "h4" | "h5";
}) {
	const Heading = headingLevel;
	const timeFormatter = new Intl.DateTimeFormat("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		timeZone,
	});
	const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone,
	});
	return (
		<section className="rounded-xl border border-border bg-surface p-5">
			<div className="flex items-baseline justify-between gap-4">
				<div className="flex min-w-0 items-baseline gap-3">
					<Heading className="truncate font-semibold text-foreground">{label}</Heading>
					<span className="shrink-0 text-sm text-foreground-muted">{unit}</span>
				</div>
				<div className="flex items-center gap-3 text-sm text-foreground-muted">
					{gasName ? <span>Gas: {gasName}</span> : null}
				</div>
			</div>

			{series.length > 0 && (
				<ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-foreground-muted">
					{series.map(({ id, color, label: seriesLabel, strokeDasharray }) => (
						<li key={id ?? seriesLabel} className="flex min-w-0 items-center gap-2 break-words">
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
				<ParentSize>
					{({ width, height }) =>
						width > 0 && height > 0 ? (
							<XYChart
								width={width}
								height={height}
								accessibilityLabel={`${label} over time`}
								xScale={{ type: "time" }}
								yScale={{ type: "linear", nice: true, zero: false }}
								margin={{ top: 12, right: 20, bottom: 42, left: 54 }}
								theme={{ ...chartTheme, colors: series.map(({ color }) => color) }}
							>
								<Grid columns={false} numTicks={5} />
								<Axis
									orientation="bottom"
									numTicks={width < 500 ? 3 : 5}
									tickFormat={(value) => timeFormatter.format(value as Date)}
								/>
								<Axis orientation="left" numTicks={5} />
								{series.map(({ id, data, label: seriesLabel, strokeDasharray }) => (
									<LineSeries
										key={id ?? seriesLabel}
										dataKey={id ?? seriesLabel}
										data={data}
										xAccessor={(point) => point.time}
										yAccessor={(point) => point.value ?? Number.NaN}
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
										const comparisons = measurementComparisons(series, nearestPoint.time);

										return (
											<div className="text-sm">
												<div className="font-semibold">
													{dateTimeFormatter.format(nearestPoint.time)} {timeZone}
												</div>
												{series.map(({ id, color, label: seriesLabel, data }) => {
													const point = data.find(
														(datum) => datum.time.getTime() === nearestPoint.time.getTime(),
													);
													if (!point || point.value === null) return null;

													return (
														<div
															key={id ?? seriesLabel}
															className="mt-1 flex justify-between gap-4"
														>
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
												{comparisons.length > 0 ? (
													<div className="mt-3 border-t border-border pt-2">
														<div className="text-xs text-foreground-muted">Measured − setpoint</div>
														{comparisons.map((comparison) => (
															<div
																key={comparison.label}
																className="mt-1 flex justify-between gap-4"
															>
																<span>{comparison.label}</span>
																<span className="font-medium tabular-nums">
																	{formatDifference(comparison.value, unit)}
																</span>
															</div>
														))}
													</div>
												) : null}
											</div>
										);
									}}
								/>
							</XYChart>
						) : null
					}
				</ParentSize>
			</div>
		</section>
	);
}
