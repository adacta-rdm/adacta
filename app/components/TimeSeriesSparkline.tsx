type SparklineSeries = {
	label: string;
	color: string;
	data: SparklinePoint[];
	strokeDasharray?: string;
};

type SparklinePoint =
	| { time: Date | string; value: number | null }
	| { x: number; value: number | null };

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
	const values = series.flatMap(({ data }) => data.filter(hasValue));
	const axisMin = Math.min(...values.map(axisValue));
	const axisMax = Math.max(...values.map(axisValue));
	const valueMin = Math.min(...values.map(({ value }) => value));
	const valueMax = Math.max(...values.map(({ value }) => value));

	return (
		<span className="block min-w-0 rounded-lg bg-surface-muted px-2.5 py-2">
			<span className="flex items-baseline justify-between gap-2 text-xs">
				<span className="truncate font-medium text-foreground">{label}</span>
				<span className="shrink-0 text-foreground-muted">{unit}</span>
			</span>

			<span className="mt-1 grid grid-cols-[auto_1fr] items-stretch">
				<span className="flex h-9 flex-col justify-between pr-1.5 text-xs leading-none tabular-nums text-foreground-muted">
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
								d={sparklinePath(data, { axisMin, axisMax, valueMin, valueMax })}
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
	data: SparklinePoint[],
	extents: { axisMin: number; axisMax: number; valueMin: number; valueMax: number },
) {
	const axisRange = extents.axisMax - extents.axisMin || 1;
	const valueRange = extents.valueMax - extents.valueMin || 1;

	return data
		.map((point, index) => {
			if (point.value === null) return "";
			const x =
				padding + ((axisValue(point) - extents.axisMin) / axisRange) * (width - 2 * padding);
			const y =
				height - padding - ((point.value - extents.valueMin) / valueRange) * (height - 2 * padding);

			return `${index === 0 || data[index - 1]?.value === null ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
		})
		.join(" ");
}

function hasValue(point: SparklinePoint): point is SparklinePoint & { value: number } {
	return point.value !== null;
}

function axisValue(point: SparklinePoint) {
	return "time" in point
		? point.time instanceof Date
			? point.time.getTime()
			: new Date(point.time).getTime()
		: point.x;
}
