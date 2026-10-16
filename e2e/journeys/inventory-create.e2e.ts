import { randomUUID } from "node:crypto";

import { expect, followLink, test } from "../fixtures.ts";
import { seedCatalogManufacturer } from "../seed-data.ts";

test("manual equipment creates a reusable user product", async ({ page }) => {
	const maker = seedCatalogManufacturer("adacta-demo-instruments");
	const suffix = randomUUID();
	const entryName = `E2E argon controller ${suffix}`;
	const productName = `E2E flow controller ${suffix}`;

	await page.goto("/inventory");
	await page.getByRole("link", { name: "Add equipment", exact: true }).click();
	await page.getByLabel("Equipment name").fill(entryName);
	await page.getByLabel("Product name").fill(productName);
	await page.getByLabel("Manufacturer", { exact: true }).fill(maker.name);
	await page.getByRole("option", { name: maker.name, exact: true }).click();
	await page.getByRole("button", { name: "Add equipment", exact: true }).click();

	await expect(page.getByRole("heading", { name: entryName, exact: true })).toBeVisible();
	await expect(page.getByText("User entered", { exact: true })).toBeVisible();
	await followLink(page, page.getByRole("link", { name: productName, exact: true }));
	await expect(page.getByRole("heading", { name: productName, exact: true })).toBeVisible();
	await expect(page.getByText("User entered", { exact: true })).toBeVisible();
});

test("new manufacturer name is shown only when adding a manufacturer", async ({ page }) => {
	await page.goto("/inventory/new");
	await expect(page.getByLabel("New manufacturer name")).toHaveCount(0);

	await page.getByLabel("Manufacturer", { exact: true }).fill("unknown");
	await page.getByRole("option", { name: "Add a manufacturer", exact: true }).click();

	await expect(page.getByLabel("New manufacturer name")).toBeVisible();
});
