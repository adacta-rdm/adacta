import { createReadStream } from "fs";
import { Readable as NodeReadable } from "node:stream";
import { join } from "path";

import { Minipass } from "minipass";
import { describe, expect, test, vi } from "vitest";

import { createDuplex } from "../createDuplex";
import { createReadable } from "../createReadable";
describe("createReadable", () => {
	test("does The Right Thing", async () => {
		const readStream = createReadStream(join(__dirname, "0123456789.txt"));

		const readable = createReadable(readStream);

		expect(readable).toBeInstanceOf(Minipass);
		expect((await readable.concat()).toString()).toBe("0123456789\n");
	});

	test("emits 'end' event", async () => {
		const readStream = createReadStream(join(__dirname, "0123456789.txt"), {
			highWaterMark: 1,
		});

		const readable = createReadable(readStream);

		const endHandler = vi.fn();

		readable.on("end", endHandler);

		await readable.pipe(createDuplex()).collect();

		expect(endHandler).toHaveBeenCalledTimes(1);
	});

	test("wrap multiple times", async () => {
		expect.assertions(1);

		const source = createReadStream(join(__dirname, "0123456789.txt"));
		const readable1 = createReadable(source);
		const readable2 = createReadable(readable1);

		for await (const k of readable2) {
			expect(k.toString()).toBe("0123456789\n");
		}
	});

	test("iterate over wrapped node stream", async () => {
		expect.assertions(1);

		const source = createReadStream(join(__dirname, "0123456789.txt"));
		const readable = createReadable(source);

		for await (const k of readable) {
			expect(k.toString()).toBe("0123456789\n");
		}
	});

	test("collect() wrapped async GeneratorFunction", async () => {
		// eslint-disable-next-line @typescript-eslint/require-await
		const asyncGenerator = async function* () {
			yield Promise.resolve(1);
			yield Promise.resolve(2);
		};

		const readable = createReadable(asyncGenerator);

		const arr: number[] = await readable.collect();

		expect(arr).toHaveLength(2);
		expect(arr[0]).toBe(1);
		expect(arr[1]).toBe(2);
	});

	test("error handling for wrapped node stream", async () => {
		expect.assertions(2);

		const source = new NodeReadable({
			read() {},
		});
		source.push("hello ");
		source.push("world");

		const readable = createReadable(source);
		const error = new Error("Oh no.");

		setImmediate(() => source.destroy(error));

		try {
			for await (const k of readable) {
				expect(k.toString()).toBe("hello world");
			}
		} catch (e) {
			expect(e).toBe(error);
		}
	});
});
