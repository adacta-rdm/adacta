import { describe, expect, test } from "bun:test";

import {
	clampSidebarWidth,
	DEFAULT_SIDEBAR_WIDTH,
	MAX_SIDEBAR_WIDTH,
	MIN_SIDEBAR_WIDTH,
	sidebarWidthFromCookie,
} from "~/app/lib/sidebarWidth";

describe("clampSidebarWidth", () => {
	test("keeps a width that is within the bounds", () => {
		expect(clampSidebarWidth(300)).toBe(300);
	});

	test("pulls a width outside the bounds back to them", () => {
		expect(clampSidebarWidth(0)).toBe(MIN_SIDEBAR_WIDTH);
		expect(clampSidebarWidth(10_000)).toBe(MAX_SIDEBAR_WIDTH);
	});
});

describe("sidebarWidthFromCookie", () => {
	test("reads the width a browser sent back", () => {
		expect(sidebarWidthFromCookie("adacta.sidebar.width=320")).toBe(320);
	});

	test("finds the width among other cookies", () => {
		expect(sidebarWidthFromCookie("session=abc; adacta.sidebar.width=320; other=1")).toBe(320);
	});

	test("takes the default when no cookie was sent", () => {
		expect(sidebarWidthFromCookie(null)).toBe(DEFAULT_SIDEBAR_WIDTH);
		expect(sidebarWidthFromCookie("")).toBe(DEFAULT_SIDEBAR_WIDTH);
		expect(sidebarWidthFromCookie("session=abc")).toBe(DEFAULT_SIDEBAR_WIDTH);
	});

	test("takes the default when the value is not a number", () => {
		// The value is whatever a browser sends back. It is not to be trusted.
		expect(sidebarWidthFromCookie("adacta.sidebar.width=wide")).toBe(DEFAULT_SIDEBAR_WIDTH);
	});

	test("holds a value outside the bounds to them", () => {
		expect(sidebarWidthFromCookie("adacta.sidebar.width=99999")).toBe(MAX_SIDEBAR_WIDTH);
	});
});
