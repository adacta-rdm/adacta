import { describe, expect, test } from "bun:test";

import { highlightToml } from "~/app/lib/tomlHighlight.ts";

describe("TOML highlighting", () => {
	test("classifies common TOML syntax while preserving text", () => {
		const text = '[rig]\nname = "test # stand"\ncount = 3\nactive = true # ready';
		const lines = highlightToml(text);

		expect(lines[0]).toContainEqual({ kind: "table", text: "[rig]" });
		expect(lines[1]).toContainEqual({ kind: "key", text: "name" });
		expect(lines[1]).toContainEqual({ kind: "string", text: '"test # stand"' });
		expect(lines[2]).toContainEqual({ kind: "number", text: "3" });
		expect(lines[3]).toContainEqual({ kind: "boolean", text: "true" });
		expect(lines[3]).toContainEqual({ kind: "comment", text: "# ready" });
		expect(lines.map((line) => line.map((token) => token.text).join("")).join("\n")).toBe(text);
	});
});
