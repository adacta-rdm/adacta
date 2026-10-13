import { href } from "react-router";

import { expect, followLink, test } from "../fixtures.ts";
import { seedInventoryEntry } from "../seed-data.ts";

test("viewing a diagram selects symbols only while the sidecar is open", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));

	const valve = page.locator('.react-flow__node[data-id$="-h2-valve"]');
	await expect(valve).not.toHaveClass(/selected/);

	await page.getByRole("button", { name: "Dataset sidecar", exact: true }).click();
	await valve.getByText("H2 supply valve", { exact: true }).click();
	await expect(valve).toHaveClass(/selected/);

	await page.getByRole("button", { name: "Collapse Dataset sidecar" }).click();
	await expect(valve).not.toHaveClass(/selected/);
});

test("Cancel restores the saved diagram before editing again", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));

	await page.getByRole("link", { name: "Edit diagram" }).click();
	const valve = page.locator('.react-flow__node[data-id$="-h2-valve"]');
	await valve.getByText("H2 supply valve", { exact: true }).click();
	await page.getByRole("textbox", { name: "Label" }).fill("Temporary valve name");
	await expect(valve.getByText("Temporary valve name", { exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Cancel" }).click();
	await expect(page.getByRole("link", { name: "Edit diagram" })).toBeVisible();
	await expect(valve.getByText("H2 supply valve", { exact: true })).toBeVisible();
	await expect(valve.getByText("Temporary valve name", { exact: true })).toHaveCount(0);

	await page.getByRole("link", { name: "Edit diagram" }).click();
	await valve.getByText("H2 supply valve", { exact: true }).click();
	await expect(page.getByRole("textbox", { name: "Label" })).toHaveValue("H2 supply valve");
});

test("diagram labels open their matching fields while editing", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));

	const valveLabel = page
		.locator('.react-flow__node[data-id$="-h2-valve"]')
		.getByText("H2 supply valve", { exact: true });
	await expect(page.getByRole("textbox", { name: "Label" })).toHaveCount(0);

	await page.getByRole("link", { name: "Edit diagram" }).click();
	await valveLabel.click();
	await expect(page.getByRole("textbox", { name: "Label" })).toHaveValue("H2 supply valve");
	await page.getByRole("button", { name: "Collapse selection panel" }).click();
	await expect(page.getByRole("button", { name: "Show details" })).toBeVisible();
	await valveLabel.dblclick();
	await expect(page.getByRole("textbox", { name: "Label" })).toBeFocused();
	await expect(page.getByRole("button", { name: "Collapse selection panel" })).toBeVisible();

	const note = page.getByText("Purge with N2 before start-up", { exact: true });
	await note.dblclick();
	await expect(page.getByRole("textbox", { name: "Label" })).toBeFocused();
	await expect(page.getByRole("textbox", { name: "Label" })).toHaveValue(
		"Purge with N2 before start-up",
	);
	await page.getByRole("button", { name: "Collapse selection panel" }).click();

	const instrumentLabel = page
		.locator('.react-flow__node[data-id$="-reactor-thermocouple"]')
		.getByText("TI", { exact: true });
	await instrumentLabel.dblclick();
	await expect(page.getByRole("textbox", { name: "Function" })).toBeFocused();
	await page.getByRole("button", { name: "Collapse selection panel" }).click();
	const instrumentLabelBefore = await instrumentLabel.boundingBox();
	if (!instrumentLabelBefore) throw new Error("The Instrument label is not visible.");
	await page.mouse.move(
		instrumentLabelBefore.x + instrumentLabelBefore.width / 2,
		instrumentLabelBefore.y + instrumentLabelBefore.height / 2,
	);
	await page.mouse.down();
	await page.mouse.move(
		instrumentLabelBefore.x + instrumentLabelBefore.width / 2 + 40,
		instrumentLabelBefore.y + instrumentLabelBefore.height / 2,
		{ steps: 5 },
	);
	await page.mouse.up();
	const instrumentLabelAfter = await instrumentLabel.boundingBox();
	if (!instrumentLabelAfter || instrumentLabelAfter.x <= instrumentLabelBefore.x) {
		throw new Error("Dragging the Instrument label did not move the symbol.");
	}
	await page.getByText("TC-01", { exact: true }).dblclick();
	await expect(page.getByRole("textbox", { name: "Tag" })).toBeFocused();

	await page.getByRole("button", { name: "Hand" }).click();
	const tagBox = await page.getByText("TC-01", { exact: true }).boundingBox();
	if (!tagBox) throw new Error("The instrument tag is not visible.");
	await page.mouse.dblclick(tagBox.x + tagBox.width / 2, tagBox.y + tagBox.height / 2);
	await expect(page.getByRole("textbox", { name: "Tag" })).not.toBeFocused();
});

test("the selection panel can collapse, move, and reopen", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));
	await page.getByRole("link", { name: "Edit diagram" }).click();

	await page.getByText("Methanation reactor", { exact: true }).click();
	const panel = page
		.getByRole("complementary")
		.filter({ has: page.getByRole("button", { name: "Move selection panel" }) });
	await page.getByRole("button", { name: "Collapse selection panel" }).click();
	await expect(panel.getByRole("heading", { name: "Methanation reactor" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Add Caption" })).toHaveCount(0);

	const move = page.getByRole("button", { name: "Move selection panel" });
	const before = await panel.boundingBox();
	if (!before) throw new Error("The collapsed selection panel is not visible.");
	const heading = panel.getByRole("heading", { name: "Methanation reactor" });
	const headingBox = await heading.boundingBox();
	if (!headingBox) throw new Error("The selection panel title is not visible.");
	await page.mouse.move(headingBox.x + headingBox.width / 2, headingBox.y + headingBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		headingBox.x + headingBox.width / 2 + 24,
		headingBox.y + headingBox.height / 2,
	);
	await page.mouse.up();
	const dragged = await panel.boundingBox();
	if (!dragged || dragged.x <= before.x)
		throw new Error("Dragging the title did not move the panel.");

	await move.focus();
	await page.keyboard.press("ArrowRight");
	const after = await panel.boundingBox();
	if (!after || after.x <= before.x) throw new Error("The selection panel did not move.");

	await page.getByText("H2 supply valve", { exact: true }).click();
	await expect(panel.getByRole("heading", { name: "H2 supply valve" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Expand selection panel" })).toBeVisible();
	await page.getByRole("button", { name: "Expand selection panel" }).click();
	await expect(page.getByRole("button", { name: "Add Caption" })).toBeVisible();

	await page.getByRole("button", { name: "Collapse selection panel" }).click();
	await page.getByRole("button", { name: "Show details" }).click();
	await expect(page.getByRole("button", { name: "Add Caption" })).toBeVisible();
});

test("symbol search finds familiar device names", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));
	await page.getByRole("link", { name: "Edit diagram" }).click();

	const filter = page.getByRole("textbox", { name: "Filter P&ID symbols" });
	await filter.fill("MFC");
	const instrument = page.getByRole("button", { name: "Instrument Matches: MFC" });
	await expect(instrument).toBeVisible();
	await instrument.click();
	await expect(page.getByRole("textbox", { name: "Function" })).toHaveValue("Instrument");

	await filter.fill("Exhaust");
	await expect(
		page.getByRole("button", { name: "Covered gas vent Matches: exhaust" }),
	).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Curved gas vent Matches: exhaust" }),
	).toBeVisible();
});

test("Junctions and Samples dropped on equipment stay inside it", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));
	await page.getByRole("link", { name: "Edit diagram" }).click();

	const instruments = page.getByRole("button", { name: "Instruments and marks" });
	if ((await instruments.getAttribute("aria-expanded")) === "false") await instruments.click();

	const reactor = page.getByText("Methanation reactor", { exact: true });
	async function dropOnReactor(name: "Junction" | "Sample") {
		const symbol = page.getByRole("button", { name, exact: true });
		await symbol.scrollIntoViewIfNeeded();

		const reactorBox = await reactor.evaluate((label) =>
			label.closest(".react-flow__node")?.getBoundingClientRect().toJSON(),
		);
		const symbolBox = await symbol.boundingBox();
		if (!reactorBox || !symbolBox) throw new Error("The symbol or reactor is not visible.");

		await page.mouse.move(symbolBox.x + symbolBox.width / 2, symbolBox.y + symbolBox.height / 2);
		await page.mouse.down();
		await page.mouse.move(
			reactorBox.x + reactorBox.width / 2,
			reactorBox.y + reactorBox.height / 2,
			{
				steps: 8,
			},
		);
		await page.mouse.up();
	}

	await dropOnReactor("Junction");
	await expect(page.getByText("Inside", { exact: true })).toBeVisible();
	await expect(page.getByText("Methanation reactor", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Undo" }).click();
	await expect(page.getByText("Inside", { exact: true })).toHaveCount(0);

	await dropOnReactor("Sample");
	await expect(page.getByText("Inside", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Undo" }).click();
});

test("dropping a Junction on a pipe connects both pipe sections", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));
	await page.getByRole("link", { name: "Edit diagram" }).click();

	const pipe = page.locator('.react-flow__edge[data-id$="-h2-valve-to-mfc"]');
	const junction = page.getByRole("button", { name: "Junction", exact: true });
	await junction.scrollIntoViewIfNeeded();
	const ends = (await pipe.getAttribute("aria-label"))?.match(/^Edge from (.+) to (.+)$/);
	if (!ends) throw new Error("The pipe endpoints are unavailable.");
	const source = await page.locator(`.react-flow__node[data-id="${ends[1]}"]`).boundingBox();
	const target = await page.locator(`.react-flow__node[data-id="${ends[2]}"]`).boundingBox();
	if (!source || !target) throw new Error("The pipe endpoints are not visible.");
	const sourceCenter = { x: source.x + source.width / 2, y: source.y + source.height / 2 };
	const targetCenter = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
	const drop = {
		x: sourceCenter.x + (targetCenter.x - sourceCenter.x) * 0.43,
		y: sourceCenter.y,
	};
	const originalNodeCount = await page.locator(".react-flow__node").count();
	const originalEdgeCount = await page.locator(".react-flow__edge").count();
	const paletteBox = await junction.boundingBox();
	if (!paletteBox) throw new Error("The Junction is not visible in the palette.");

	await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(drop.x, drop.y, { steps: 10 });
	await expect(pipe).toHaveClass(/pid-connection-split-candidate/);
	await page.mouse.up();
	await expect(page.locator(".react-flow__node")).toHaveCount(originalNodeCount + 1);
	await expect(page.locator(".react-flow__edge")).toHaveCount(originalEdgeCount + 1);
	await expect(pipe).toHaveCount(0);

	await page.getByRole("button", { name: "Undo" }).click();
	await expect(page.locator(".react-flow__node")).toHaveCount(originalNodeCount);
	await expect(page.locator(".react-flow__edge")).toHaveCount(originalEdgeCount);

	await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(drop.x + 240, drop.y + 170, { steps: 10 });
	await page.mouse.up();
	const placed = page.locator(".react-flow__node.selected");
	const placedBox = await placed.boundingBox();
	if (!placedBox) throw new Error("The placed Junction is not visible.");
	await page.mouse.move(placedBox.x + placedBox.width / 2, placedBox.y + placedBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(drop.x, drop.y, { steps: 10 });
	await expect(pipe).toHaveClass(/pid-connection-split-candidate/);
	await page.mouse.up();
	await expect(page.locator(".react-flow__node")).toHaveCount(originalNodeCount + 1);
	await expect(page.locator(".react-flow__edge")).toHaveCount(originalEdgeCount + 1);
});

test("splitting a jacketed pipe measures the process route", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));
	await page.getByRole("link", { name: "Edit diagram" }).click();

	const pipe = page.locator('.react-flow__edge[data-id$="-h2-valve-to-mfc"]');
	await pipe.click();
	await page
		.getByRole("group", { name: "The connection" })
		.getByRole("button", { name: "Jacketed", exact: true })
		.click();
	await page.getByRole("spinbutton", { name: "Length" }).fill("10");
	await page.getByRole("button", { name: "Add arrow" }).click();

	const junction = page.getByRole("button", { name: "Junction", exact: true });
	await junction.scrollIntoViewIfNeeded();
	const drop = await pipe.locator("path.pid-process-line").evaluate((path) => {
		const route = path as SVGPathElement;
		const point = route.getPointAtLength(route.getTotalLength() * 0.4);
		const matrix = route.getScreenCTM();
		if (!matrix) throw new Error("The process route has no screen position.");
		const screen = point.matrixTransform(matrix);
		return { x: screen.x, y: screen.y };
	});
	const originalNodeCount = await page.locator(".react-flow__node").count();
	const paletteBox = await junction.boundingBox();
	if (!paletteBox) throw new Error("The Junction is not visible in the palette.");

	await page.mouse.move(paletteBox.x + paletteBox.width / 2, paletteBox.y + paletteBox.height / 2);
	await page.mouse.down();
	await page.mouse.move(drop.x, drop.y, { steps: 10 });
	await expect(pipe).toHaveClass(/pid-connection-split-candidate/);
	await page.mouse.up();
	await expect(page.locator(".react-flow__node")).toHaveCount(originalNodeCount + 1);

	const junctionId = await page.locator(".react-flow__node.selected").getAttribute("data-id");
	if (!junctionId) throw new Error("The split Junction is missing.");
	const upstream = page.locator(`.react-flow__edge[aria-label$=" to ${junctionId}"]`);
	const downstream = page.locator(`.react-flow__edge[aria-label^="Edge from ${junctionId} to "]`);
	await page.getByRole("button", { name: "Collapse selection panel" }).click();

	async function selectConnection(edge: typeof upstream) {
		const center = await edge.locator("path[data-pid-process-route]").evaluate((path) => {
			const route = path as SVGPathElement;
			const point = route.getPointAtLength(route.getTotalLength() / 2);
			const matrix = route.getScreenCTM();
			if (!matrix) throw new Error("The process route has no screen position.");
			const screen = point.matrixTransform(matrix);
			return { x: screen.x, y: screen.y };
		});
		await page.mouse.click(center.x, center.y);
		await expect(edge).toHaveClass(/selected/);
		await page.getByRole("button", { name: "Expand selection panel" }).click();
	}

	await selectConnection(upstream);
	const upstreamLength = Number(
		await page.getByRole("spinbutton", { name: "Length" }).inputValue(),
	);
	expect(Math.abs(upstreamLength - 4)).toBeLessThan(0.2);
	await page.getByRole("button", { name: "Collapse selection panel" }).click();
	await selectConnection(downstream);
	const downstreamLength = Number(
		await page.getByRole("spinbutton", { name: "Length" }).inputValue(),
	);
	expect(Math.abs(downstreamLength - 6)).toBeLessThan(0.2);
	const arrowPosition = Number(
		await page.getByRole("slider", { name: "Arrow 1 position" }).inputValue(),
	);
	expect(arrowPosition).toBeGreaterThanOrEqual(15);
	expect(arrowPosition).toBeLessThanOrEqual(18);
});

test("Add Caption connects a new point inside equipment to a new Instrument", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));
	await page.getByRole("link", { name: "Edit diagram" }).click();

	const originalNodeIds = await page
		.locator(".react-flow__node")
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-id")));
	const originalEdgeIds = await page
		.locator(".react-flow__edge")
		.evaluateAll((edges) => edges.map((edge) => edge.getAttribute("data-id")));

	await page.getByText("Methanation reactor", { exact: true }).click();
	await page.getByRole("button", { name: "Add Caption" }).click();
	await expect(page.getByRole("textbox", { name: "Function" })).toHaveValue("Instrument");

	const addedNodeIds = (
		await page
			.locator(".react-flow__node")
			.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-id")))
	).filter((id) => id && !originalNodeIds.includes(id));
	const addedEdgeIds = (
		await page
			.locator(".react-flow__edge")
			.evaluateAll((edges) => edges.map((edge) => edge.getAttribute("data-id")))
	).filter((id) => id && !originalEdgeIds.includes(id));
	if (addedNodeIds.length !== 2 || addedEdgeIds.length !== 1) {
		throw new Error("Add Caption did not create two symbols and one connection.");
	}

	const instrumentId = await page.locator(".react-flow__node.selected").getAttribute("data-id");
	const junctionId = addedNodeIds.find((id) => id !== instrumentId);
	if (!junctionId) throw new Error("The Junction is missing.");
	await page.locator(`.react-flow__node[data-id="${junctionId}"]`).click({ force: true });
	await expect(page.getByText("Inside", { exact: true })).toBeVisible();
	await expect(
		page.getByRole("paragraph").filter({ hasText: "Methanation reactor" }),
	).toBeVisible();

	await page.locator(`.react-flow__edge[data-id="${addedEdgeIds[0]}"]`).click({ force: true });
	await expect(
		page.getByRole("button", { name: "Caption", exact: true, pressed: true }),
	).toHaveCount(1);

	await page.getByRole("button", { name: "Undo" }).click();
	await expect(page.locator(".react-flow__node")).toHaveCount(originalNodeIds.length);
	await expect(page.locator(".react-flow__edge")).toHaveCount(originalEdgeIds.length);
});

test("a newly placed symbol can be copied and pasted", async ({ page }) => {
	await page.goto(href("/inventory"));
	const entry = seedInventoryEntry("methanation-test-stand");
	const inventory = page.getByRole("list", { name: "Inventory by location" });
	await followLink(page, inventory.getByRole("link", { name: entry.name }));
	await followLink(page, page.getByRole("link", { name: "P&ID", exact: true }));
	await page.getByRole("link", { name: "Edit diagram" }).click();

	const originalNodes = await page.locator(".react-flow__node").count();
	const filter = page.getByRole("textbox", { name: "Filter P&ID symbols" });
	await filter.fill("MFC");
	await page.getByRole("button", { name: "Instrument Matches: MFC" }).click();
	await expect(page.locator(".react-flow__node")).toHaveCount(originalNodes + 1);

	await page.keyboard.press("ControlOrMeta+c");
	await page.keyboard.press("ControlOrMeta+v");
	await expect(page.locator(".react-flow__node")).toHaveCount(originalNodes + 2);
});
