import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Adacta-authored components name a semantic role from theme.css, such as
 * `bg-surface`. They never name a palette color, and they never carry a
 * `dark:` class. A role already holds both of its values, so one theme file
 * decides how the whole interface looks in light and in dark.
 *
 * This test reads every component under app/ and fails on either mistake. For
 * example, `text-slate-900` must be written `text-foreground`.
 *
 * The vendored kits under vendor/ are not read. They are upstream code, and
 * the `dark:` variant in app.css is declared so that their classes follow the
 * same theme these roles do.
 */

const APP_DIR = path.resolve(import.meta.dir, "..");

/** A utility naming a palette color, such as `dark:border-slate-800`. */
const PALETTE_UTILITY =
	/(?:^|["\s:[])(?:[a-z-]+:)*(?:bg|text|fill|stroke|border|divide|ring|shadow|from|via|to|decoration|outline|accent)-(?:slate|gray|sky|zinc|neutral|stone|indigo|blue|cyan|amber|red|green|pink|teal|white|black)(?:-\d{2,3})?(?:\/\[?[\d.%]+\]?)?/g;

/** A `dark:` variant, which a semantic role makes unnecessary. */
const DARK_VARIANT = /(?:^|["\s:[])dark:[a-z[]/g;

/**
 * The docs icon illustrations are a drawing rather than a set of roles. Each
 * has separate light and dark artwork, chosen with `dark:hidden`, and its
 * gradients have fixed stops.
 */
const DECORATIVE = /^components\/docs\/(Icon\.tsx|icons\/)/;

function componentFiles(dir: string, found: string[] = []): string[] {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__") componentFiles(full, found);
		} else if (entry.name.endsWith(".tsx")) {
			const relative = path.relative(APP_DIR, full);
			if (!DECORATIVE.test(relative)) found.push(relative);
		}
	}
	return found;
}

const files = componentFiles(APP_DIR).sort();

describe("Adacta components", () => {
	test("there are components to check", () => {
		expect(files.length).toBeGreaterThan(20);
	});

	for (const file of files) {
		test(`${file} uses semantic roles only`, () => {
			const source = fs.readFileSync(path.join(APP_DIR, file), "utf8");

			expect({
				palette: [...source.matchAll(PALETTE_UTILITY)].map((m) => m[0].trim()),
				darkVariants: [...source.matchAll(DARK_VARIANT)].map((m) => m[0].trim()),
			}).toEqual({ palette: [], darkVariants: [] });
		});
	}
});
