import { expect, test } from "bun:test";

import { measurementComparisons } from "~/app/components/TimeSeriesChart.tsx";
import { measurementCharts, type ChartColumn } from "~/app/lib/measurementCharts.ts";

const time: ChartColumn = {
	id: "time",
	position: 0,
	displayName: "Time",
	parquetType: "TIMESTAMP",
	unit: null,
	inventoryEntryId: null,
	inventoryName: null,
	channelKey: null,
	channelRole: null,
	quantityKindId: null,
	gasName: null,
	pidNodeId: null,
};

function channel(id: string, position: number, overrides: Partial<ChartColumn> = {}): ChartColumn {
	return {
		id,
		position,
		displayName: id,
		parquetType: "DOUBLE",
		unit: "mL/min",
		inventoryEntryId: 1,
		inventoryName: "MFC",
		channelKey: "flow",
		channelRole: "measurement",
		quantityKindId: "VolumeFlowRate",
		gasName: null,
		pidNodeId: "inlet-device",
		...overrides,
	};
}

test("pairs measurements and setpoints on the same exact scale", () => {
	const columns = [
		time,
		channel("measured", 1),
		channel("requested", 2, { channelRole: "setpoint" }),
	];
	const samples = [
		{
			id: "sample",
			sampleName: "Catalyst",
			sampleBatchName: "Batch A",
			pidNodeId: "sample-node",
			anchorNodeId: "furnace",
			inletNodeIds: ["inlet-device"],
			outletNodeIds: [],
		},
	];
	const result = measurementCharts(columns, samples, [["2026-08-20T09:00:00Z", "38", "40"]]);
	const inlet = result[0]!.sections[0]!.charts;
	expect(result[0]!.name).toBe("Batch A · Catalyst");
	expect(inlet).toHaveLength(1);
	expect(inlet[0]!.series).toHaveLength(2);
	expect(inlet[0]!.series[0]!.color).toBe(inlet[0]!.series[1]!.color);
	expect(inlet[0]!.series[1]!.strokeDasharray).toBe("6 4");
	expect(inlet[0]!.series.map(({ label }) => label)).toEqual(["MFC · Measured", "MFC · Setpoint"]);
	expect(measurementComparisons(inlet[0]!.series, new Date("2026-08-20T09:00:00Z"))).toEqual([
		{ label: "MFC", value: -2 },
	]);
});

test("uses gas labels for devices with the same name", () => {
	const columns = [
		time,
		channel("n2", 1, { gasName: "N2" }),
		channel("h2", 2, { gasName: "H2", inventoryEntryId: 2, pidNodeId: "other-device" }),
	];
	const result = measurementCharts(columns, [], [["2026-08-20T09:00:00Z", "1", "2"]]);
	expect(result[0]!.sections[3]!.charts[0]!.series.map(({ label }) => label)).toEqual([
		"N2 · Measured",
		"H2 · Measured",
	]);
});

test("distinguishes channels from one device in one chart", () => {
	const columns = [
		time,
		channel("no", 1, { displayName: "NO", channelKey: "NO", gasName: "N2" }),
		channel("no2", 2, { displayName: "NO2", channelKey: "NO2", gasName: "N2" }),
	];
	const result = measurementCharts(columns, [], [["2026-08-20T09:00:00Z", "1", "2"]]);

	expect(result[0]!.sections[3]!.charts).toHaveLength(1);
	expect(result[0]!.sections[3]!.charts[0]!.series.map(({ label }) => label)).toEqual([
		"NO · Measured",
		"NO2 · Measured",
	]);
	expect(result[0]!.sections[3]!.charts[0]!.series[0]!.color).not.toBe(
		result[0]!.sections[3]!.charts[0]!.series[1]!.color,
	);
});

test("shows no deviation when a setpoint has no value at the measured time", () => {
	const columns = [
		time,
		channel("measured", 1),
		channel("requested", 2, { channelRole: "setpoint" }),
	];
	const chart = measurementCharts(columns, [], [["2026-08-20T09:00:00Z", "38", null]])[0]!
		.sections[3]!.charts[0]!;
	expect(measurementComparisons(chart.series, new Date("2026-08-20T09:00:00Z"))).toEqual([]);
});

test("keeps missing values as chart gaps", () => {
	const columns = [
		time,
		channel("measured", 1),
		channel("requested", 2, { channelRole: "setpoint" }),
	];
	const rows = [
		["2026-08-20T09:00:00Z", "38", "40"],
		["2026-08-20T09:01:00Z", null, "40"],
		["2026-08-20T09:02:00Z", "41", null],
	];
	const chart = measurementCharts(columns, [], rows)[0]!.sections[3]!.charts[0]!;
	expect(chart.series[0]!.data.map(({ value }) => value)).toEqual([38, null, 41]);
	expect(measurementComparisons(chart.series, new Date("2026-08-20T09:01:00Z"))).toEqual([]);
	expect(measurementComparisons(chart.series, new Date("2026-08-20T09:02:00Z"))).toEqual([]);
});

test("separates units and ambiguous flow positions for each sample", () => {
	const columns = [
		time,
		channel("inlet", 1),
		channel("other-unit", 2, { unit: "L/h" }),
		channel("outlet", 3, { pidNodeId: "outlet-device", inventoryEntryId: 2 }),
	];
	const samples = [
		{
			id: "first",
			sampleName: "First",
			sampleBatchName: null,
			pidNodeId: "sample-first",
			anchorNodeId: "furnace",
			inletNodeIds: ["inlet-device"],
			outletNodeIds: ["outlet-device"],
		},
		{
			id: "second",
			sampleName: "Second",
			sampleBatchName: null,
			pidNodeId: "sample-second",
			anchorNodeId: null,
			inletNodeIds: ["inlet-device"],
			outletNodeIds: ["inlet-device"],
		},
	];
	const result = measurementCharts(columns, samples, [["2026-08-20T09:00:00Z", "1", "2", "3"]]);
	expect(result[0]!.sections[0]!.charts).toHaveLength(2);
	expect(result[0]!.sections[2]!.charts).toHaveLength(1);
	expect(result[1]!.sections[3]!.charts).toHaveLength(2);
});

test("puts a sample container in At sample", () => {
	const columns = [time, channel("furnace", 1, { pidNodeId: "furnace" })];
	const samples = [
		{
			id: "sample",
			sampleName: "#01",
			sampleBatchName: "Batch A",
			pidNodeId: "sample-node",
			anchorNodeId: "furnace",
			inletNodeIds: [],
			outletNodeIds: [],
		},
	];
	const result = measurementCharts(columns, samples, [["2026-08-20T09:00:00Z", "250"]]);
	expect(result[0]!.sections[1]!.charts).toHaveLength(1);
	expect(result[0]!.sections[3]!.charts).toHaveLength(0);
});

test("uses a channel key when quantity meaning is unavailable", () => {
	const columns = [
		time,
		channel("flow", 1, { quantityKindId: null }),
		channel("pressure", 2, { quantityKindId: null, channelKey: "pressure" }),
	];
	const result = measurementCharts(columns, [], [["2026-08-20T09:00:00Z", "1", "2"]]);
	expect(result[0]!.sections[3]!.charts).toHaveLength(2);
});
