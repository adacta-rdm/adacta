import { describe, test, expect } from "vitest";

import { decodeEntityId } from "../decodeEntityId";

describe("decodeEntityId", () => {
	test("returns correct class", () => {
		// The type is encoded in the 6th byte
		const Entity = decodeEntityId("f794f217-fdf1-4a00-8c76-443ca81e334e");

		expect(Entity).toBe("Project");
	});

	describe("errors", () => {
		test("throws error when type is not defined", () => {
			expect(() => decodeEntityId("00345678-12ff-faaa-fbbb-0123456789ab")).toThrow(/entity/);
		});
	});
});
