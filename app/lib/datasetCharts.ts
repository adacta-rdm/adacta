import type { TimeSeries } from "~/app/components/TimeSeriesChart.tsx";
import { quantityKindName } from "~/app/lib/quantities.ts";

export type ChartColumn = {
	id: string;
	position: number;
	displayName: string;
	parquetType: string;
	axis?: string | null;
	unit: string | null;
	inventoryEntryId: number | null;
	inventoryName: string | null;
	channelKey: string | null;
	channelRole: string | null;
	quantityKindId: string | null;
	gasName: string | null;
	pidNodeId: string | null;
};

export type ChartSample = {
	id: string;
	sampleName: string;
	sampleBatchName: string | null;
	pidNodeId: string;
	anchorNodeId: string | null;
	inletNodeIds: string[];
	outletNodeIds: string[];
};

export type DatasetChart = {
	id: string;
	label: string;
	unit: string;
	series: TimeSeries[];
};

export type SampleCharts = {
	id: string;
	name: string;
	sections: { name: "Inlet" | "At sample" | "Outlet" | "Unknown"; charts: DatasetChart[] }[];
};

const colors = [
	"var(--adacta-color-series-1)",
	"var(--adacta-color-series-2)",
	"var(--adacta-color-series-3)",
	"var(--adacta-color-series-4)",
	"var(--adacta-color-series-5)",
	"var(--adacta-color-series-6)",
	"var(--adacta-color-series-7)",
	"var(--adacta-color-series-8)",
];

/**
 * Group columns by their saved process position and exact chart scale.
 */
export function datasetCharts(
	columns: ChartColumn[],
	samples: ChartSample[],
	rows: (string | null)[][],
): SampleCharts[] {
	const axisIndex = columns.findIndex(
		(column) => column.axis === "numeric" || column.parquetType === "TIMESTAMP",
	);
	if (axisIndex < 0) return [];
	const numericAxis = columns[axisIndex]!.axis === "numeric";
	const numeric = columns
		.filter((column) => column.parquetType === "DOUBLE" && column.axis !== "numeric")
		.map((column) => ({
			column,
			data: rows.flatMap((row) => {
				const axis = row[axisIndex];
				const value = row[column.position];
				if (axis === null) return [];
				const coordinate = numericAxis ? Number(axis) : new Date(axis);
				if (
					numericAxis
						? !Number.isFinite(coordinate as number)
						: !Number.isFinite((coordinate as Date).getTime())
				)
					return [];
				const number = value === null ? null : Number(value);
				return [
					{
						...(numericAxis ? { x: coordinate as number } : { time: coordinate as Date }),
						value: number !== null && Number.isFinite(number) ? number : null,
					},
				];
			}),
		}))
		.filter(({ data }) => data.some((point) => point.value !== null));
	const seriesKeys = [
		...new Set(
			numeric.map(({ column }) =>
				JSON.stringify([
					column.inventoryEntryId ?? column.pidNodeId ?? column.id,
					column.channelKey,
				]),
			),
		),
	];

	const subjects =
		samples.length > 0
			? samples
			: [
					{
						id: "unassigned",
						sampleName: "Unassigned",
						sampleBatchName: null,
						pidNodeId: "",
						anchorNodeId: null,
						inletNodeIds: [],
						outletNodeIds: [],
					},
				];
	return subjects.map((sample) => ({
		id: sample.id,
		name: sample.sampleBatchName
			? `${sample.sampleBatchName} · ${sample.sampleName}`
			: sample.sampleName,
		sections: (["Inlet", "At sample", "Outlet", "Unknown"] as const).map((name) => {
			const members = numeric.filter(({ column }) => {
				const atSample =
					column.pidNodeId !== null &&
					(column.pidNodeId === sample.anchorNodeId || column.pidNodeId === sample.pidNodeId);
				const inlet = column.pidNodeId !== null && sample.inletNodeIds.includes(column.pidNodeId);
				const outlet = column.pidNodeId !== null && sample.outletNodeIds.includes(column.pidNodeId);
				const position = atSample
					? "At sample"
					: inlet === outlet
						? "Unknown"
						: inlet
							? "Inlet"
							: "Outlet";
				return position === name;
			});
			const grouped = new Map<string, typeof members>();
			for (const member of members) {
				const { column } = member;
				const meaning = column.quantityKindId
					? `quantity:${column.quantityKindId}`
					: column.channelKey
						? `channel:${column.channelKey}`
						: `column:${column.id}`;
				const key = JSON.stringify([meaning, column.unit]);
				grouped.set(key, [...(grouped.get(key) ?? []), member]);
			}
			const charts = [...grouped.entries()].map(([id, members]) => {
				const first = members[0]!.column;
				const deviceNames = new Map<string | number, string>();
				const seriesCounts = new Map<string | number, number>();
				for (const { column } of members) {
					const device = column.inventoryEntryId ?? column.pidNodeId ?? column.id;
					const role = column.channelRole === "setpoint" ? "setpoint" : "measurement";
					const roleKey = `${device}:${role}`;
					seriesCounts.set(roleKey, (seriesCounts.get(roleKey) ?? 0) + 1);
					const sameGas = members.filter(({ column: peer }) => peer.gasName === column.gasName);
					const gasIdentifiesDevice =
						column.gasName &&
						!column.gasName.includes(",") &&
						sameGas.every(
							({ column: peer }) => (peer.inventoryEntryId ?? peer.pidNodeId ?? peer.id) === device,
						);
					const sameName = members.filter(
						({ column: peer }) => peer.inventoryName === column.inventoryName,
					);
					const nameIdentifiesDevice =
						column.inventoryName &&
						sameName.every(
							({ column: peer }) => (peer.inventoryEntryId ?? peer.pidNodeId ?? peer.id) === device,
						);
					deviceNames.set(
						device,
						gasIdentifiesDevice
							? column.gasName!
							: nameIdentifiesDevice
								? column.inventoryName!
								: column.displayName,
					);
				}
				return {
					id,
					label: first.quantityKindId
						? quantityKindName(first.quantityKindId)
						: (first.channelKey ?? first.displayName),
					unit: first.unit ?? "",
					series: members.map(({ column, data }) => {
						const device = column.inventoryEntryId ?? column.pidNodeId ?? column.id;
						const role = column.channelRole === "setpoint" ? "Setpoint" : "Measured";
						const roleKey = `${device}:${role === "Setpoint" ? "setpoint" : "measurement"}`;
						const deviceLabel =
							(seriesCounts.get(roleKey) ?? 0) > 1
								? column.displayName || column.channelKey || deviceNames.get(device)!
								: deviceNames.get(device)!;
						return {
							id: column.id,
							label: `${deviceLabel} · ${role}`,
							comparisonKey: JSON.stringify([device, column.channelKey]),
							comparisonLabel: deviceLabel,
							role:
								column.channelRole === "setpoint"
									? ("setpoint" as const)
									: ("measurement" as const),
							color:
								colors[
									seriesKeys.indexOf(JSON.stringify([device, column.channelKey])) % colors.length
								]!,
							data,
							...(column.channelRole === "setpoint" ? { strokeDasharray: "6 4" } : {}),
						};
					}),
				};
			});
			return { name, charts };
		}),
	}));
}
