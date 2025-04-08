import { describe, expect, test } from "vitest";

import { createVirtualGroups } from "~/apps/desktop-app/src/components/componentNodeTreeProvider/ComponentNodeTreeProvider";

const flattenHierarchy = (
	hierarchy: { pathFromTopLevelDevice: string[] | readonly string[] }[]
) => {
	return hierarchy.map((h) => h.pathFromTopLevelDevice.join(" -> ")).sort();
};

describe("createVirtualGroups", () => {
	test("should create virtual groups correctly", () => {
		expect(
			flattenHierarchy(
				createVirtualGroups([
					{ pathFromTopLevelDevice: ["VirtualGroup/Test"], component: { __typename: "Device" } },
				])
			)
		).toMatchInlineSnapshot(`
			[
			  "VirtualGroup",
			  "VirtualGroup -> Test",
			]
		`);
	});

	test("should create nested virtual groups correctly", () => {
		expect(
			flattenHierarchy(
				createVirtualGroups([
					{
						pathFromTopLevelDevice: ["VirtualGroup/VirtualSubGroup/Test"],
						component: { __typename: "Device" },
					},
					{
						pathFromTopLevelDevice: ["VirtualGroup/VirtualSubGroup/Test2"],
						component: { __typename: "Device" },
					},
				])
			)
		).toMatchInlineSnapshot(`
			[
			  "VirtualGroup",
			  "VirtualGroup -> VirtualSubGroup",
			  "VirtualGroup -> VirtualSubGroup -> Test",
			  "VirtualGroup -> VirtualSubGroup -> Test2",
			]
		`);
	});
});
