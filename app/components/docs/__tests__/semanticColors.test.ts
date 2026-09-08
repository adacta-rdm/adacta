import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * The docs chrome was ported from a template that used the Tailwind slate and
 * sky palettes directly. Adacta-authored UI uses the semantic roles in
 * theme.css instead, so the manual and the application stay one design.
 *
 * This test reads the docs components and fails on a palette color in a
 * utility class. For example, `text-slate-900` must be written
 * `text-foreground`.
 */

const DOCS_DIR = path.resolve(import.meta.dir, "..");

/**
 * Utility classes naming a Tailwind palette color, such as `text-slate-900`,
 * `dark:border-slate-800`, or `prose-pre:bg-slate-900`.
 */
const PALETTE_UTILITY =
	/(?:^|["\s:[])(?:[a-z-]+:)*(?:bg|text|fill|stroke|border|divide|ring|shadow|from|via|to|decoration|outline|accent)-(?:slate|gray|sky|zinc|neutral|stone|indigo|blue|cyan|amber|red|green|pink|teal)-\d{2,3}(?:\/\d+)?/g;

/**
 * Files whose palette use is a picture rather than a UI role. The icon
 * illustrations are gradients with fixed stops, and recoloring them would
 * change the drawing rather than the theme.
 */
const DECORATIVE = new Set(["Icon.tsx"]);

function docsComponents(): string[] {
	return fs
		.readdirSync(DOCS_DIR)
		.filter((file) => file.endsWith(".tsx"))
		.filter((file) => !DECORATIVE.has(file))
		.sort();
}

describe("docs components", () => {
	test("there are components to check", () => {
		expect(docsComponents().length).toBeGreaterThan(5);
	});

	for (const file of docsComponents()) {
		test(`${file} uses semantic colors, not palette colors`, () => {
			const source = fs.readFileSync(path.join(DOCS_DIR, file), "utf8");
			const found = [...source.matchAll(PALETTE_UTILITY)].map((match) => match[0].trim());

			expect(found).toEqual([]);
		});
	}
});
