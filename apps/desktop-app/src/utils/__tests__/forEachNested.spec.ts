import { describe, test, expect } from "vitest";

import { forEachNested } from "../forEachNested";

describe("forEachNested", () => {
	test("basic", () => {
		const test = {
			id: "1",
			children: [
				{ test: "123" },
				{
					id: "2",
					foo: 5,
					bar: 42,
					test: { x: { y: { z: { id: "3", a: { b: { c: { id: "test", additional: 5 } } } } } } },
				},
			],
		};

		const ids: any[] = [];
		forEachNested(test, (key, value) => {
			if (key === "id") {
				ids.push(value);
			}
		});

		expect(ids).toStrictEqual(["test", "3", "2", "1"]);
	});
});
