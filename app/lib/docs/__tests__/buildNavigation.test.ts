import { describe, expect, test } from "bun:test";

import { buildNavigation, docHref } from "../buildNavigation.ts";

describe("docHref", () => {
	test("the introduction is served at the docs root", () => {
		expect(docHref("introduction")).toBe("/docs");
	});

	test("every other doc is served under its slug", () => {
		expect(docHref("concepts")).toBe("/docs/concepts");
		expect(docHref("setup-evidence")).toBe("/docs/setup-evidence");
	});
});

describe("buildNavigation", () => {
	const titles = {
		introduction: { title: "Introduction" },
		concepts: { title: "Core concepts" },
		"planned-data-import": {
			title: "Planned data import and traceability",
			navTitle: "Planned data import",
		},
	};

	test("a link takes its title from the doc and its href from the slug", () => {
		const navigation = buildNavigation(
			[{ title: "User Manual", slugs: ["introduction", "concepts"] }],
			titles,
		);

		expect(navigation).toEqual([
			{
				title: "User Manual",
				links: [
					{ title: "Introduction", href: "/docs" },
					{ title: "Core concepts", href: "/docs/concepts" },
				],
			},
		]);
	});

	test("a doc that sets navTitle uses it instead of its page title", () => {
		const [section] = buildNavigation(
			[{ title: "User Manual", slugs: ["planned-data-import"] }],
			titles,
		);

		expect(section.links).toEqual([
			{ title: "Planned data import", href: "/docs/planned-data-import" },
		]);
	});

	test("the slug stands in when no doc of that name was found", () => {
		const [section] = buildNavigation([{ title: "User Manual", slugs: ["missing"] }], titles);

		expect(section.links).toEqual([{ title: "missing", href: "/docs/missing" }]);
	});

	test("the authored order is kept", () => {
		const [section] = buildNavigation(
			[{ title: "User Manual", slugs: ["concepts", "introduction"] }],
			titles,
		);

		expect(section.links.map((link) => link.href)).toEqual(["/docs/concepts", "/docs"]);
	});
});
