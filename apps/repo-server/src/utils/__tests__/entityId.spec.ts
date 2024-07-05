import { describe, test, expect } from "vitest";

import { decodeEntityId } from "../decodeEntityId";
import { entityId } from "../entityId";

describe("entityId", () => {
	const samples: string[] = [];
	for (let i = 0; i < 100_000; i++) {
		samples.push(entityId("00"));
	}

	test("generates unique ids", () => {
		const unique = new Set(samples);
		expect(unique.size).toBe(samples.length);
	});

	test("generates v4 conforming ids", () => {
		for (const id of samples) {
			expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
		}
	});

	test("generates ids in ascending order", () => {
		const sorted = [...samples].sort();
		for (let i = 0; i < samples.length; i++) {
			expect(samples[i]).toBe(sorted[i]);
		}
	});

	test.each([
		["00", "Project"],
		[0, "Project"],
		["10", "Transformation"],
		[10, "Transformation"],
		[255, "User"],
		["255", "User"],
		[0xff, "User"],
	])("creates an id with encoded type information", (typeId, typeName) => {
		const id = entityId(typeId);

		expect(decodeEntityId(id)).toBe(typeName);
	});

	test("throws an error if the type id is not a valid hex string or number", () => {
		expect(() => entityId(-12)).toThrow(/hex string/);
		expect(() => entityId(1024)).toThrow(/hex string/);
		expect(() => entityId("affe")).toThrow(/hex string/);
		expect(() => entityId("xy")).toThrow(/hex string/);
	});
});
