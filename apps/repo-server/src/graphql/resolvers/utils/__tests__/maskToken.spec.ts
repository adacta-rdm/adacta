import { describe, expect, test } from "vitest";

import { maskToken } from "~/apps/repo-server/src/graphql/resolvers/utils/maskToken";

describe("maskToken", () => {
	test("Masks the token", () => {
		expect(maskToken("1234", 2)).toBe("12**");
		expect(maskToken("1234", 4)).toBe("1234");
		expect(maskToken("12341234", 4)).toBe("1234****");
	});
});
