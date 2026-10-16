import { randomUUID } from "node:crypto";

import { expect, expectURL, followLink, test } from "../fixtures.ts";
import { seedCatalogManufacturer, seedCatalogProduct } from "../seed-data.ts";

test("selected catalog products create equipment entries", async ({ page }) => {
	const maker = seedCatalogManufacturer("adacta-demo-instruments");
	const model = seedCatalogProduct("adacta-demo-instruments", "dfc-100");
	const name = `E2E DFC ${randomUUID()}`;

	await page.goto("/catalog");
	await page.getByRole("checkbox", { name: `Select ${maker.name} ${model.productNumber}` }).check();
	await page.getByLabel("Filter the catalog").fill(model.productNumber);
	await expect(
		page.getByRole("checkbox", { name: `Select ${maker.name} ${model.productNumber}` }),
	).toBeChecked();
	await page.getByRole("table").getByRole("link", { name: maker.name, exact: true }).click();
	await page.getByRole("link", { name: "Import 1 selected", exact: true }).click();
	await page.getByLabel("Equipment name").fill(name);
	await page.getByRole("button", { name: "Import equipment", exact: true }).click();

	await expectURL(page, "/inventory");
	await page.getByLabel("Filter the inventory").fill(name);
	await followLink(page, page.getByRole("table").getByRole("link", { name, exact: true }));
	await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
	await expect(page.getByRole("link", { name: model.name, exact: true })).toBeVisible();
});
