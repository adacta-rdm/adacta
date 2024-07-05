import { Readable } from "stream";

import { describe, test, expect } from "vitest";

import { LineTransform } from "../LineTransform";

describe("LineTransform", () => {
	test("event handler style", async () => {
		const a = Readable.from("a b c\nd e f\ng h i").pipe(new LineTransform());

		const lines: string[] = [];
		a.on("data", (d) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
			lines.push(d.toString());
		});

		expect(
			await new Promise<string[]>((resolve) => {
				a.on("end", () => {
					resolve(lines);
				});
			})
		).toStrictEqual(["a b c", "d e f", "g h i"]);
	});

	test("object mode", async () => {
		const a = Readable.from("a b c\nd e f\ng h i").pipe(new LineTransform());

		const lines: string[] = [];

		a.on("readable", () => {
			let data;

			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			while ((data = a.read()) !== null) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
				lines.push(data.toString());
			}
		});
		expect(
			await new Promise<string[]>((resolve) => {
				a.on("end", () => {
					resolve(lines);
				});
			})
		).toStrictEqual(["a b c", "d e f", "g h i"]);
	});
});
