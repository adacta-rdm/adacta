import { describe, expect, test } from "bun:test";

import { slugify } from "~/app/lib/slugs";

describe("slugFromName", () => {
	test("turns a scientific name into a readable URL segment", () => {
		expect(slugify("Au/TiO2 (1 wt%) 2025-B")).toBe("au-tio2-1-wt-2025-b");
	});

	test("keeps the number from a sample label", () => {
		expect(slugify("#04")).toBe("04");
	});

	test("keeps scientific symbols that are letters", () => {
		expect(slugify("β-Al2O3")).toBe("β-al2o3");
	});
});
