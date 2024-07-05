import type { UnitKind } from "@omegadot/einheiten/dist/types/quantities/kind";
import { describe, test, expect } from "vitest";

import { assertUnitKind, assertUnitKinds } from "../assertUnitKind";

describe("assertUnitKind", () => {
	test("accepts valid unit kinds", () => {
		const kindInput = "length";

		assertUnitKind(kindInput);

		// Test if the type is actually narrowed
		const kindOutput: UnitKind = kindInput;

		// Artificially use the variable to avoid unused variable warning and also have a expect() call
		expect(kindOutput).toBe("length");
	});

	test("rejects invalid unit kinds", () => {
		expect(() => assertUnitKind("BOGUS")).toThrow();
	});
});

describe("assertUnitKinds", () => {
	test("accepts valid unit kinds", () => {
		const kindInput = ["length", "unitless"];

		assertUnitKinds(kindInput);

		// Test if the type is actually narrowed
		const kindOutput: UnitKind = kindInput[0];

		// Artificially use the variable to avoid unused variable warning and also have a expect() call
		expect(kindOutput).toBe("length");
	});

	test("rejects with single invalid unit kind", () => {
		expect(() => assertUnitKinds(["length", "BOGUS"])).toThrow();
	});
});
