import { describe, expect, test } from "bun:test";

import { parseId53 } from "~/lib/id53/parseId53.ts";

describe("parseId53", () => {
	test.each([
		["0", 0],
		["1234567890123", 1234567890123],
		["9007199254740991", Number.MAX_SAFE_INTEGER],
	])("reads %p", (text, id) => {
		expect(parseId53(text)).toBe(id);
	});

	test.each([
		["abc"],
		["12abc"],
		["1e3"],
		["-5"],
		["9007199254740992"],
		[""],
		[" 12"],
		["1.5"],
		["0x1f"],
		["007"],
		["00"],
	])("rejects %p", (text) => {
		expect(parseId53(text)).toBeUndefined();
	});
});
