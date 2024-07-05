import { test, expect } from "vitest";

import { secondsToHMS } from "../secondsToHMS";

test("secondToHMS", () => {
	expect(secondsToHMS(50)).toStrictEqual([0, 0, 50]);
	expect(secondsToHMS(60 + 10)).toStrictEqual([0, 1, 10]);
	expect(secondsToHMS(5 * 60 * 60 + 60 + 10)).toStrictEqual([5, 1, 10]);
});
