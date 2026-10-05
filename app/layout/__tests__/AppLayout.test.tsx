import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";

import { AppLayout } from "../AppLayout.tsx";

const buildings = [
	{
		identifier: "B3",
		rooms: [
			{
				identifier: "101",
				entries: [
					{
						id: 1,
						slug: "rig-1",
						name: "Rig 1",
						kind: "rig" as const,
						location: { building: "B3", room: "101", label: null },
					},
				],
			},
		],
	},
];

const batchGroups = [
	{
		name: "Co",
		supports: [
			{
				name: "Al2O3",
				batches: [
					{ id: 1, slug: "co-1", name: "Co/Al2O3", activeMaterial: "Co", support: "Al2O3" },
				],
			},
		],
	},
];

function render(path: string) {
	return renderToStaticMarkup(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					path="/*"
					element={
						<AppLayout sidebarWidth={280} buildings={buildings} batchGroups={batchGroups}>
							<p>page</p>
						</AppLayout>
					}
				/>
			</Routes>
		</MemoryRouter>,
	);
}

describe("AppLayout", () => {
	test("the top zone links every section on every page", () => {
		for (const path of ["/catalog", "/inventory", "/samples", "/files/import", "/users"]) {
			const markup = render(path);

			expect(markup).toContain(">Adacta<");
			expect(markup).toContain('href="/catalog"');
			expect(markup).toContain('href="/inventory"');
			expect(markup).toContain('href="/samples"');
			expect(markup).toContain('href="/files/import"');
			expect(markup).toContain('href="/users"');
		}
	});

	test("the middle zone shows the tree of the section in view", () => {
		const inventory = render("/inventory");
		expect(inventory).toContain("Inventory by location");
		expect(inventory).not.toContain("Batches by composition");

		const samples = render("/samples");
		expect(samples).toContain("Batches by composition");
		expect(samples).not.toContain("Inventory by location");

		const catalog = render("/catalog");
		expect(catalog).not.toContain("Inventory by location");
		expect(catalog).not.toContain("Batches by composition");
	});

	test("a tree row is indented by padding, so no nested list carries a margin", () => {
		const markup = render("/inventory");
		const lists = markup.match(/<ul[^>]*>/g) ?? [];

		expect(lists.length).toBeGreaterThan(2);
		for (const list of lists) {
			expect(list).not.toMatch(/\bml-\d/);
		}
	});
});
