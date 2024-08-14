import { describe, expect, test, vi } from "vitest";

import { createDuplex } from "~/lib/streams";

describe("createDuplex", () => {
	test.skip("passthrough with strings", async () => {
		const passThrough = createDuplex();

		passThrough.write("a");
		passThrough.write("b");
		passThrough.write("c");
		passThrough.end();

		expect(await passThrough.collect()).toEqual(["a", "b", "c"]);
	});

	test("transform function that returns data", async () => {
		const transformStream = createDuplex({
			transform: (chunk: number) => chunk * 2,
		});

		// No consumers, hence the stream should signal to stop writing.
		expect(transformStream.write(0)).toBe(false);
		expect(transformStream.write(1)).toBe(false);
		transformStream.end(2);

		const values = await transformStream.collect();

		expect(values).toEqual([0, 2, 4]);
	});

	test("transform function that calls callback", async () => {
		const transformStream = createDuplex({
			transform: (chunk: number, cb) => cb(null, chunk * 2),
		});

		// No consumers, hence the stream should signal to stop writing.
		expect(transformStream.write(0)).toBe(false);
		expect(transformStream.write(1)).toBe(false);
		transformStream.end(2);

		const values = await transformStream.collect();

		expect(values).toEqual([0, 2, 4]);
	});

	test("error in transform destroys stream", () => {
		const error = new Error("oh no");
		const transformStream = createDuplex({
			transform: () => {
				throw error;
			},
		});
		const listener = vi.fn();
		transformStream.on("error", listener);

		transformStream.write("hello");

		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledWith(error);
	});
});
