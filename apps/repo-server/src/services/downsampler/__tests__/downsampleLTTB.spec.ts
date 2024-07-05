import { mkdirTmp } from "@omegadot/fs";
import { FileSystemStorageEngine } from "@omegadot/storage-engine";
import { createDuplex, createPipeline, createReadable } from "@omegadot/streams";
import { TabularData } from "@omegadot/tabular-data";
import downsampler from "downsample-lttb";
import { zip } from "lodash";
import { describe, test, expect } from "vitest";

import { createDownsampleLTTBTransformStream } from "../createDownsampleLTTBTransformStream";
import { downsampleLTTBRowMajorAsync } from "../downsampleLTTBRowMajorAsync";

describe("LTTB", () => {
	function setup(options: { input: number; output: number } = { input: 500, output: 20 }) {
		const x = Array.from(Array(options.input).keys());

		const data = {
			x,
			sin: x.map((x) => Math.sin(x)),
			cos: x.map((x) => Math.cos(x)),
		};

		const series = {
			sin: zip(x, data.sin) as [number, number][],
			cos: zip(x, data.cos) as [number, number][],
		};

		const reference = {
			sin: downsampler.processData(series.sin, options.output),
			cos: downsampler.processData(series.cos, options.output),
		};

		return {
			data,
			series,
			reference,
		};
	}

	test.each([
		["sin", 25, 20],
		["sin", 50, 20],
		["sin", 500, 40],
		["cos", 25, 20],
		["cos", 50, 20],
		["cos", 500, 40],
	] as const)(
		"async implementation gives same result as reference implementation - %s %i -> %i",
		async (data, input, output) => {
			const { series, reference } = setup({ input, output });

			const result = await downsampleLTTBRowMajorAsync(createReadable(series[data]), input, output);

			expect(result).toHaveLength(reference[data].length);
			expect(result).toEqual(reference[data]);
		}
	);

	test.each([
		[25, 3],
		[25, 20],
		[50, 20],
		[500, 40],
	] as const)(
		"async implementation gives same result as reference implementation (multiple columns) - %i -> %i",
		async (input, output) => {
			const { reference, data } = setup({ input, output });

			const rows = zip(data.x, data.sin, data.x, data.cos) as number[][];

			const result = await downsampleLTTBRowMajorAsync(createReadable(rows), input, output, [
				{ x: 0, y: 1 }, // sin
				{ x: 2, y: 3 }, // cos
			]);

			expect(result).toHaveLength(2);
			expect(result[0]).toHaveLength(reference["sin"].length);
			expect(result[0]).toEqual(reference["sin"]);
			expect(result[1]).toHaveLength(reference["cos"].length);
			expect(result[1]).toEqual(reference["cos"]);
		}
	);

	test("x and y index options", async () => {
		const { data, reference } = setup({ input: 50, output: 12 });

		const rows = zip(data.sin, data.x, data.cos) as number[][];

		const result = await downsampleLTTBRowMajorAsync(
			createReadable(rows),
			50,
			12,
			// Downsample sin data
			{ x: 1, y: 0 }
		);

		expect(result).toHaveLength(reference.sin.length);
		expect(result).toEqual(reference.sin);
	});

	test("threshold higher than number of points in dataset skips downsampling (single x/y-pair)", async () => {
		const inputLength = 10;
		const { data } = setup({ input: inputLength, output: 20 });

		const rows = zip(data.sin, data.x, data.cos) as number[][];

		const result = await downsampleLTTBRowMajorAsync(
			createReadable(rows),
			inputLength,
			20,
			// Downsample sin data
			{ x: 1, y: 0 }
		);

		expect(result).toHaveLength(inputLength);
		expect(result).toEqual(rows.map(([y, x]) => [x, y]));
	});

	test("threshold higher than number of points in dataset skips downsampling (multiple x/y-pairs)", async () => {
		const inputLength = 10;
		const { data } = setup({ input: inputLength, output: 20 });

		const rows = zip(data.sin, data.x, data.cos) as number[][];

		const result = await downsampleLTTBRowMajorAsync(
			createReadable(rows),
			inputLength,
			20,
			// Downsample sin + cos data
			[
				{ x: 1, y: 0 }, // sin
				{ x: 1, y: 2 }, // cos
			]
		);

		expect(result[0]).toHaveLength(inputLength);
		expect(result[0]).toEqual(rows.map(([y1, x]) => [x, y1]));
		expect(result[1]).toHaveLength(inputLength);
		expect(result[1]).toEqual(rows.map(([, x, y2]) => [x, y2]));
	});

	test("pipe input stream to multiple transform streams", async () => {
		const { data, reference } = setup({ input: 50, output: 12 });

		const rows = zip(data.x, data.sin, data.cos) as number[][];
		const source = createReadable(rows);

		const tee = createDuplex();

		const p = Promise.all([
			createPipeline(tee, createDownsampleLTTBTransformStream(50, 12, { y: 1 })).collect(),
			createPipeline(tee, createDownsampleLTTBTransformStream(50, 12, { y: 2 })).collect(),
		]);

		createPipeline(source, tee);

		const [sin, cos] = await p;

		expect(sin).toHaveLength(reference.sin.length);
		expect(cos).toHaveLength(reference.cos.length);
		expect(Array.from(sin)).toEqual(reference.sin);
		expect(Array.from(cos)).toEqual(reference.cos);
	});

	test("pipe tabular data to multiple transform streams", async () => {
		const { data, reference } = setup({ input: 50, output: 12 });

		const sto = new FileSystemStorageEngine(await mkdirTmp());
		const filename = "data.rtd";
		const td = await TabularData.open(sto, filename, 3);
		const stream = td.createWriteStream();
		const rows = zip(data.x, data.sin, data.cos) as number[][];

		for (const row of rows) stream.write(row);
		stream.end();

		await stream.promise();

		const source = td.createReadStream();

		const tee = createDuplex();

		const sin = createPipeline(
			tee,
			createDownsampleLTTBTransformStream(50, 12, { y: 1 })
		).collect();
		const cos = createPipeline(
			tee,
			createDownsampleLTTBTransformStream(50, 12, { y: 2 })
		).collect();

		createPipeline(source, tee);

		expect(Array.from(await sin)).toHaveLength(reference.sin.length);
		expect(Array.from(await cos)).toHaveLength(reference.cos.length);
		expect(Array.from(await sin)).toEqual(reference.sin);
		expect(Array.from(await cos)).toEqual(reference.cos);
	});
});
