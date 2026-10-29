import { randomUUID } from "node:crypto";

import { expect, expectURL, followLink, test } from "../fixtures.ts";
import { seedCatalogManufacturer, seedCatalogProduct } from "../seed-data.ts";

test("selected catalog products create equipment entries", async ({ page }) => {
	const maker = seedCatalogManufacturer("adacta-demo-instruments");
	const model = seedCatalogProduct("adacta-demo-instruments", "dfc-100");
	const serialNumber = `E2E DFC ${randomUUID()}`;
	const units = page
		.getByRole("table", { name: "Equipment" })
		.getByRole("link", { name: model.name, exact: true });

	// Other units of this model exist already. The new unit is the link that is missing here.
	await page.goto("/inventory");
	const existing = await units.evaluateAll((links) =>
		links.map((link) => link.getAttribute("href")),
	);
	await page.goto("/catalog");
	await page.getByRole("checkbox", { name: `Select ${maker.name} ${model.productNumber}` }).check();
	await page.getByRole("textbox", { name: "Filter catalog" }).fill(model.productNumber);
	await expect(
		page.getByRole("checkbox", { name: `Select ${maker.name} ${model.productNumber}` }),
	).toBeChecked();
	await page.getByRole("table").getByRole("link", { name: maker.name, exact: true }).click();
	await page.getByRole("link", { name: "Import 1 selected", exact: true }).click();
	await page.getByLabel("Serial number").fill(serialNumber);
	await page.getByRole("button", { name: "Add equipment", exact: true }).click();

	await expectURL(page, "/inventory");
	const added = units.and(
		page.locator(`a${existing.map((address) => `:not([href="${address}"])`).join("")}`),
	);
	await followLink(page, added);
	await expect(page).toHaveURL(/\/inventory\/equipment\/[^/]+$/);
	await expect(page.getByRole("heading", { name: model.name, exact: true })).toBeVisible();
	await expect(page.getByText(`Serial number: ${serialNumber}`)).toBeVisible();
	await expect(
		page.getByRole("main").getByRole("link", { name: model.name, exact: true }),
	).toBeVisible();
});
