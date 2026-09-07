import reactorCsvUrl from "./downsampling-demo.csv?url";
import reactorCsv from "./downsampling-demo.csv?raw";
import ftirCsvUrl from "./ftir-gas-analysis.csv?url";
import ftirCsv from "./ftir-gas-analysis.csv?raw";
import mfcCsvUrl from "./mfc-log.csv?url";
import mfcCsv from "./mfc-log.csv?raw";

type Series = {
	label: string;
	color: string;
	data: { time: Date; value: number }[];
	strokeDasharray?: string;
};

export type ExampleRecording = {
	slug: string;
	title: string;
	description: string;
	summary: string;
	fileName: string;
	fileUrl: string;
	charts: {
		label: string;
		unit: string;
		series: Series[];
	}[];
	previews: {
		label: string;
		unit: string;
		series: Series[];
	}[];
};

const seriesColors = {
	first: "var(--adacta-color-series-1)",
	second: "var(--adacta-color-series-2)",
};

export const exampleRecordings = [reactorRecording(), mfcRecording(), ftirRecording()];

export function exampleRecording(slug: string) {
	return exampleRecordings.find((recording) => recording.slug === slug);
}

function reactorRecording(): ExampleRecording {
	const rows = parseCsv(reactorCsv, ["time", "temperature", "pressure"]);
	const temperature = seriesFrom(rows, "temperature", "Temperature", seriesColors.first);
	const pressure = seriesFrom(rows, "pressure", "Pressure", seriesColors.second);

	return {
		slug: "downsampling-demo",
		title: "Example reactor ramp",
		description: "Temperature and pressure recorded over 29 minutes in 30 observations.",
		summary: "Temperature and pressure · 30 observations · 29 minutes",
		fileName: "downsampling-demo.csv",
		fileUrl: reactorCsvUrl,
		charts: [
			{ label: "Temperature", unit: "°C", series: [temperature] },
			{ label: "Pressure", unit: "bar", series: [pressure] },
		],
		previews: [
			{ label: "Temperature", unit: "°C", series: [temperature] },
			{ label: "Pressure", unit: "bar", series: [pressure] },
		],
	};
}

function mfcRecording(): ExampleRecording {
	const rows = parseCsv(mfcCsv, [
		"time",
		"n2_flow_setpoint",
		"n2_flow_measured",
		"h2_flow_setpoint",
		"h2_flow_measured",
	]);
	const nitrogenSetpoint = seriesFrom(
		rows,
		"n2_flow_setpoint",
		"Nitrogen setpoint",
		seriesColors.first,
		"6 4",
	);
	const nitrogenMeasured = seriesFrom(
		rows,
		"n2_flow_measured",
		"Nitrogen measured",
		seriesColors.first,
	);
	const hydrogenSetpoint = seriesFrom(
		rows,
		"h2_flow_setpoint",
		"Hydrogen setpoint",
		seriesColors.second,
		"6 4",
	);
	const hydrogenMeasured = seriesFrom(
		rows,
		"h2_flow_measured",
		"Hydrogen measured",
		seriesColors.second,
	);

	return {
		slug: "mfc-log",
		title: "MFC log",
		description: "Nitrogen and hydrogen flow setpoints and measurements over 29 minutes.",
		summary: "4 flow channels · 59 observations · 29 minutes",
		fileName: "mfc-log.csv",
		fileUrl: mfcCsvUrl,
		charts: [
			{
				label: "Gas flow",
				unit: "ml/min",
				series: [nitrogenSetpoint, nitrogenMeasured, hydrogenSetpoint, hydrogenMeasured],
			},
		],
		previews: [
			{
				label: "Nitrogen flow",
				unit: "ml/min",
				series: [nitrogenSetpoint],
			},
			{
				label: "Hydrogen flow",
				unit: "ml/min",
				series: [hydrogenSetpoint],
			},
		],
	};
}

function ftirRecording(): ExampleRecording {
	const rows = parseCsv(ftirCsv, ["time", "nh3_concentration", "h2o_concentration"]);
	const ammonia = seriesFrom(rows, "nh3_concentration", "Ammonia", seriesColors.first);
	const water = seriesFrom(rows, "h2o_concentration", "Water", seriesColors.second);

	return {
		slug: "ftir-gas-analysis",
		title: "FTIR gas analysis",
		description: "Ammonia and water concentrations measured every two minutes.",
		summary: "2 concentration channels · 15 observations · 28 minutes",
		fileName: "ftir-gas-analysis.csv",
		fileUrl: ftirCsvUrl,
		charts: [
			{
				label: "Gas concentrations",
				unit: "ppm",
				series: [ammonia, water],
			},
		],
		previews: [
			{ label: "Ammonia", unit: "ppm", series: [ammonia] },
			{ label: "Water", unit: "ppm", series: [water] },
		],
	};
}

function parseCsv(contents: string, columns: string[]) {
	const [header, ...rows] = contents.trim().split(/\r?\n/);
	if (header !== columns.join(",")) {
		throw new Error("The example data has an unexpected header.");
	}

	return rows.map((row, rowIndex) => {
		const values = row.split(",").map(Number);
		if (values.length !== columns.length || !values.every(Number.isFinite)) {
			throw new Error(`The example data has an invalid value on row ${rowIndex + 2}.`);
		}

		return Object.fromEntries(columns.map((column, columnIndex) => [column, values[columnIndex]]));
	});
}

function seriesFrom(
	rows: Record<string, number>[],
	column: string,
	label: string,
	color: string,
	strokeDasharray?: string,
): Series {
	return {
		label,
		color,
		strokeDasharray,
		data: rows.map((row) => ({ time: new Date(row.time), value: row[column] })),
	};
}
