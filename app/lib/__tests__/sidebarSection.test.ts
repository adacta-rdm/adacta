import { describe, expect, test } from "bun:test";

import { sidebarSection } from "../sidebarSection.ts";

describe("sidebarSection", () => {
	test("the first path segment names the section", () => {
		expect(sidebarSection("/inventory")).toBe("inventory");
		expect(sidebarSection("/inventory/rig-1")).toBe("inventory");
		expect(sidebarSection("/samples/new")).toBe("samples");
		expect(sidebarSection("/catalog/netzsch")).toBe("catalog");
		expect(sidebarSection("/files/import")).toBe("files");
		expect(sidebarSection("/users")).toBe("users");
	});

	test("an unknown segment or the application root has no section", () => {
		expect(sidebarSection("/")).toBeUndefined();
		expect(sidebarSection("/settings")).toBeUndefined();
	});

	test("the first segment determines the section of a nested path", () => {
		expect(sidebarSection("/samples/inventory")).toBe("samples");
	});
});
