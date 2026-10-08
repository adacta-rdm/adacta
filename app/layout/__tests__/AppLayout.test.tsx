import { describe, expect, test } from "bun:test";

import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router";

import { AppLayout } from "../AppLayout.tsx";
import { maxRightSidebarWidth } from "../SidebarLayout.tsx";
import type { LeftSidebar, RightSidebar } from "../routeSidebar.ts";

const InventoryPanel = () => <p>Inventory by location</p>;
const SamplesPanel = () => <p>Batches by composition</p>;

function render(
	path: string,
	sidebarCollapsed = false,
	rightSidebar?: RightSidebar,
	leftSidebar?: LeftSidebar,
) {
	return renderToStaticMarkup(
		<MemoryRouter initialEntries={[path]}>
			<Routes>
				<Route
					path="/*"
					element={
						<AppLayout
							sidebarWidth={280}
							sidebarCollapsed={sidebarCollapsed}
							leftSidebar={leftSidebar}
							rightSidebar={rightSidebar}
						>
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
		for (const path of [
			"/catalog",
			"/inventory",
			"/samples",
			"/files",
			"/files/import",
			"/users",
		]) {
			const markup = render(path);

			expect(markup).toContain(">Adacta<");
			expect(markup).toContain('href="/catalog"');
			expect(markup).toContain('href="/inventory"');
			expect(markup).toContain('href="/samples"');
			expect(markup).toContain('href="/files"');
			expect(markup).toContain('href="/users"');
		}
	});

	test("renders the left sidebar component supplied by the route", () => {
		const inventory = render("/inventory", false, undefined, InventoryPanel);
		expect(inventory).toContain("Inventory by location");
		expect(inventory).not.toContain("Batches by composition");

		const samples = render("/samples", false, undefined, SamplesPanel);
		expect(samples).toContain("Batches by composition");
		expect(samples).not.toContain("Inventory by location");

		const catalog = render("/catalog");
		expect(catalog).not.toContain("Inventory by location");
		expect(catalog).not.toContain("Batches by composition");
	});

	test("the collapsed desktop sidebar renders labeled navigation icons", () => {
		const markup = render("/inventory", true);

		expect(markup).toContain("--sidebar-width:72px");
		expect(markup).toContain('aria-label="Expand navigation"');
		expect(markup).toContain('title="Catalog"');
		expect(markup).toContain('title="Inventory"');
		expect(markup).toContain('class="sr-only truncate">Catalog</span>');
	});

	test("renders a route panel in the desktop shell and mobile drawer", () => {
		const markup = render("/inventory", false, {
			id: "test-panel",
			title: "Details",
			defaultOpen: true,
			component: () => <p>Panel content</p>,
		});

		expect(markup).toContain('aria-label="Details"');
		expect(markup).toContain('aria-label="Resize Details"');
		expect(markup).toContain('aria-label="Open Details"');
		expect(markup).toContain("--right-sidebar-width:min(320px");
	});

	test("uses a route panel's wider editor width", () => {
		const markup = render("/inventory", false, {
			id: "sidecar",
			title: "Measurement sidecar",
			defaultOpen: true,
			defaultWidth: 480,
			component: () => <p>Editor</p>,
		});

		expect(markup).toContain("--right-sidebar-width:min(480px");
	});

	test("the right sidebar can occupy 90% of the space beside navigation", () => {
		expect(maxRightSidebarWidth(1440, 280)).toBe(1044);
		expect(maxRightSidebarWidth(1440, 72)).toBe(1231);
	});
});
