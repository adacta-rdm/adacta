import { describe, test, expect, beforeEach } from "vitest";

import {
	base10,
	base16,
	base32,
	base36,
	base49,
	base52,
	base58,
	createIdPoolIterator,
	IdPoolManager,
	PoolExhaustedError,
} from "../IdPoolManager";

import { createTestDb } from "~/apps/repo-server/testUtils";
import { InvalidArgumentError } from "~/lib/errors/InvalidArgumentError";
import type { ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";

describe("IdPoolManager", () => {
	let sc: ServiceContainer;
	beforeEach(async () => {
		sc = (await createTestDb()).sc;
	});

	test("multiple pools generate different sequences", async () => {
		const ipm = sc.get(IdPoolManager);
		const pool1 = await ipm.createIdPool({ alphabet: base58, digits: 4 });
		const pool2 = await ipm.createIdPool({ alphabet: base58, digits: 4 });

		const id1 = await ipm.getNextId(pool1);
		const id2 = await ipm.getNextId(pool2);
		expect(id1).not.toBe(id2);
	});

	test("throws when pool is exhausted", async () => {
		const ipm = sc.get(IdPoolManager);
		const pool = await ipm.createIdPool({ alphabet: "01", digits: 2 });

		// Consume all 4 IDs
		await ipm.getNextId(pool);
		await ipm.getNextId(pool);
		await ipm.getNextId(pool);
		await ipm.getNextId(pool);

		return expect(() => ipm.getNextId(pool)).rejects.toThrow(PoolExhaustedError);
	});
});

describe("createIdPoolIterator", () => {
	test("all ids contain the provided number of digits", () => {
		let counter = 0;
		const it = createIdPoolIterator({ alphabet: "01", digits: 3 }, () => counter++);

		expect.assertions(2 ** 3);

		for (const id of it) {
			expect(id).toHaveLength(3);
		}
	});

	test("returns unique items", () => {
		let counter = 0;
		const it = createIdPoolIterator({ alphabet: "012", digits: 4 }, () => counter++);

		expect.assertions(3 ** 4);
		const ids = new Set<string>();
		for (const id of it) {
			expect(ids.has(id)).toBe(false);
			ids.add(id);
		}
	});

	test.each([
		{ alphabet: base10, digits: 2 },
		{ alphabet: base16, digits: 2 },
		{ alphabet: base32, digits: 2 },
		{ alphabet: base36, digits: 2 },
		{ alphabet: base49, digits: 2 },
		{ alphabet: base52, digits: 2 },
		{ alphabet: base58, digits: 2 },
	])("implementation produces consistent results (base$alphabet.length, $digits digits)", (arg) => {
		let counter = 0;
		const it = createIdPoolIterator(arg, () => ++counter - 1);

		// Sample the first 100 IDs
		const ids = new Set<string>();
		for (let i = 0; i < 100; ++i) ids.add(it.next().value);

		// This test serves to ensure that same sequences are produced should the implementation be modified.
		// Also, the snapshots can be introspected to verify the quality of the randomization.
		expect(ids.size).toBe(100);
		expect([...ids]).toMatchSnapshot();
	});

	test("ids contain only chars of provided alphabet", () => {
		let counter = 0;
		const it = createIdPoolIterator({ alphabet: "01", digits: 4 }, () => counter++);

		expect.assertions(2 ** 4 * 4);
		for (const id of it) {
			for (const char of id) expect("01").toContain(char);
		}
	});

	test("ids are not sequential", () => {
		let counter = 0;
		const it = createIdPoolIterator({ alphabet: base10, digits: 1 }, () => counter++);

		const ids = [...it].map((id) => parseInt(id));

		expect(ids).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(ids).not.toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
		expect(ids.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	test("returns async iterator when increment function is async", async () => {
		let counter = 0;
		const it = createIdPoolIterator({ alphabet: base10, digits: 1 }, () =>
			Promise.resolve(counter++)
		);

		let ids = [];
		for await (const id of it) ids.push(id);
		ids = ids.map((id) => parseInt(id));

		expect(ids).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(ids).not.toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
		expect(ids.sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	test("rejects alphabet with duplicates", () => {
		expect(() =>
			createIdPoolIterator({ alphabet: "abcdefghijkmnopqrstuvwxyzz", digits: 1 }, () => 0)
		).toThrow(InvalidArgumentError);
	});

	test("rejects empty alphabet", () => {
		expect(() => createIdPoolIterator({ alphabet: "", digits: 1 }, () => 0)).toThrow(
			InvalidArgumentError
		);
	});

	test("rejects negative digits", () => {
		expect(() => createIdPoolIterator({ alphabet: "01", digits: -1 }, () => 0)).toThrow(
			InvalidArgumentError
		);
	});

	test("rejects zero digits", () => {
		expect(() => createIdPoolIterator({ alphabet: "01", digits: 0 }, () => 0)).toThrow(
			InvalidArgumentError
		);
	});

	test("rejects non-integer digits", () => {
		expect(() => createIdPoolIterator({ alphabet: "01", digits: 1.5 }, () => 0)).toThrow(
			InvalidArgumentError
		);
	});
});
