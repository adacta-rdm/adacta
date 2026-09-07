type SparklineSeries = {
	label: string;
	color: string;
	data: { time: Date; value: number }[];
	strokeDasharray?: string;
};

const width = 136;
const height = 34;
const padding = 2;
const valueFormatter = new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 });

export function TimeSeriesSparkline({
	label,
	unit,
	series,
}: {
	label: string;
	unit: string;
	series: SparklineSeries[];
}) {
	const values = series.flatMap(({ data }) => data);
	const timeMin = Math.min(...values.map(({ time }) => time.getTime()));
	const timeMax = Math.max(...values.map(({ time }) => time.getTime()));
	const valueMin = Math.min(...values.map(({ value }) => value));
	const valueMax = Math.max(...values.map(({ value }) => value));

	return (
		<span className="block min-w-0 rounded-lg bg-surface-muted px-2.5 py-2">
			<span className="flex items-baseline justify-between gap-2 text-xs">
				<span className="truncate font-medium text-foreground">{label}</span>
				<span className="shrink-0 text-foreground-muted">{unit}</span>
			</span>

			<span className="mt-1 grid grid-cols-[auto_1fr] items-stretch">
				<span className="flex h-9 flex-col justify-between pr-1.5 text-[10px] leading-none tabular-nums text-foreground-muted">
					<span>{valueFormatter.format(valueMax)}</span>
					<span>{valueFormatter.format(valueMin)}</span>
				</span>

				<span className="border-l border-border pl-1.5">
					<svg
						role="img"
						aria-label={`${label} preview`}
						className="block h-9 w-full overflow-visible"
						viewBox={`0 0 ${width} ${height}`}
						preserveAspectRatio="none"
					>
						{series.map(({ color, data, label: seriesLabel, strokeDasharray }) => (
							<path
								key={seriesLabel}
								d={sparklinePath(data, { timeMin, timeMax, valueMin, valueMax })}
								fill="none"
								stroke={color}
								strokeWidth="1.7"
								strokeDasharray={strokeDasharray}
								strokeLinecap="round"
								strokeLinejoin="round"
								vectorEffect="non-scaling-stroke"
							/>
						))}
					</svg>
				</span>
			</span>
		</span>
	);
}

function sparklinePath(
	data: { time: Date; value: number }[],
	extents: { timeMin: number; timeMax: number; valueMin: number; valueMax: number },
) {
	const timeRange = extents.timeMax - extents.timeMin || 1;
	const valueRange = extents.valueMax - extents.valueMin || 1;

	return data
		.map(({ time, value }, index) => {
			const x = padding + ((time.getTime() - extents.timeMin) / timeRange) * (width - 2 * padding);
			const y =
				height - padding - ((value - extents.valueMin) / valueRange) * (height - 2 * padding);

			return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
		})
		.join(" ");
}
