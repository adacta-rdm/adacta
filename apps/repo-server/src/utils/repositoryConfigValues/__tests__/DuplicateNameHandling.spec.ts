import { describe, test, expect } from "vitest";

import { DuplicateNameHandling, DuplicateNameHandlingSerializer } from "../DuplicateNameHandling";

describe("Duplicate name handling", () => {
	test("serializes", () => {
		expect(DuplicateNameHandlingSerializer.serialize(DuplicateNameHandling.WARN)).toBe("WARN");
		expect(DuplicateNameHandlingSerializer.serialize(DuplicateNameHandling.IGNORE)).toBe("IGNORE");
		expect(DuplicateNameHandlingSerializer.serialize(DuplicateNameHandling.DENY)).toBe("DENY");
	});

	test("de-serializes", () => {
		expect(DuplicateNameHandlingSerializer.deserialize("WARN")).toBe(DuplicateNameHandling.WARN);
		expect(DuplicateNameHandlingSerializer.deserialize("IGNORE")).toBe(
			DuplicateNameHandling.IGNORE
		);
		expect(DuplicateNameHandlingSerializer.deserialize("DENY")).toBe(DuplicateNameHandling.DENY);
	});
});
