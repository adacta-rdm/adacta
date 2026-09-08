import { describe, expect, test } from "bun:test";

import { sidebarSection } from "../sidebarSection.ts";

describe("sidebarSection", () => {
	test("the first path segment after the repository names the section", () => {
		expect(sidebarSection("/demo/inventory", "demo")).toBe("inventory");
		expect(sidebarSection("/demo/inventory/rig-1", "demo")).toBe("inventory");
		expect(sidebarSection("/demo/samples/new", "demo")).toBe("samples");
		expect(sidebarSection("/demo/catalog/netzsch", "demo")).toBe("catalog");
		expect(sidebarSection("/demo/files/import", "demo")).toBe("files");
	});

	test("an unknown segment or the repository root has no section", () => {
		expect(sidebarSection("/demo", "demo")).toBeUndefined();
		expect(sidebarSection("/demo/", "demo")).toBeUndefined();
		expect(sidebarSection("/demo/settings", "demo")).toBeUndefined();
	});

	test("a repository whose slug matches a section name does not confuse the two", () => {
		expect(sidebarSection("/samples/inventory", "samples")).toBe("inventory");
	});
});
