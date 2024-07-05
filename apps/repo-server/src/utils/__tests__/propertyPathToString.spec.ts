import { test, expect } from "vitest";

import { propertyPathToString } from "../propertyPathToString";

test("propertyPathToString", () => {
	expect(propertyPathToString(["cem", "lfc", "bla"])).toBe("cem -> lfc -> bla");
	expect(propertyPathToString(["cem", "lfc"])).toBe("cem -> lfc");
	expect(propertyPathToString(["cem"])).toBe("cem");
	expect(propertyPathToString([""])).toBe("");
	expect(propertyPathToString([])).toBe("");
});
