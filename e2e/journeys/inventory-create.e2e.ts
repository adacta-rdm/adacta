import { randomUUID } from "node:crypto";

import { expect, expectURL, followLink, test } from "../fixtures.ts";
import { seedCatalogManufacturer } from "../seed-data.ts";

test("a rig can be created without catalog fields", async ({ page }) => {
	const name = `E2E synthesis rig ${randomUUID()}`;

	await page.goto("/inventory/new");
	await page.getByRole("radio", { name: "Rig", exact: true }).check();
	await page.getByLabel("Rig name").fill(name);
	await page.getByRole("button", { name: "Add rig", exact: true }).click();

	await expect(page).toHaveURL(/\/inventory\/rigs\/[^/]+$/);
	await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
	await expect(page.getByRole("link", { name: "P&ID", exact: true })).toBeVisible();
});

test("manual equipment creates a reusable user product", async ({ page }) => {
	const maker = seedCatalogManufacturer("adacta-demo-instruments");
	const suffix = randomUUID();
	const productName = `E2E flow controller ${suffix}`;

	await page.goto("/inventory");
	await page.getByRole("link", { name: "Add inventory item", exact: true }).click();
	await page.getByLabel("Product name").fill(productName);
	await page.getByLabel("Manufacturer", { exact: true }).fill(maker.name);
	await page.getByRole("option", { name: maker.name, exact: true }).click();
	await page.getByRole("button", { name: "Add equipment", exact: true }).click();

	await expect(page).toHaveURL(/\/inventory\/equipment\/[^/]+$/);
	await expect(page.getByRole("heading", { name: productName, exact: true })).toBeVisible();
	await expect(page.getByText("User entered", { exact: true })).toBeVisible();
	await followLink(
		page,
		page.getByRole("main").getByRole("link", { name: productName, exact: true }),
	);
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

test("a rig and equipment with the same name open at separate addresses", async ({ page }) => {
	const name = `E2E shared name ${randomUUID()}`;
	const maker = seedCatalogManufacturer("adacta-demo-instruments");

	await page.goto("/inventory/new");
	await page.getByRole("radio", { name: "Rig", exact: true }).check();
	await page.getByLabel("Rig name").fill(name);
	await page.getByRole("button", { name: "Add rig", exact: true }).click();
	await expect(page).toHaveURL(/\/inventory\/rigs\/[^/]+$/);
	const rigSlug = new URL(page.url()).pathname.split("/").at(-1)!;
	await page.goto("/inventory/new");
	await page.getByLabel("Product name").fill(name);
	await page.getByLabel("Manufacturer", { exact: true }).fill(maker.name);
	await page.getByRole("option", { name: maker.name, exact: true }).click();
	await page.getByRole("button", { name: "Add equipment", exact: true }).click();

	await expectURL(page, "/inventory/equipment/:slug", { slug: rigSlug });
	await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
	await page.goto("/inventory");
	await followLink(
		page,
		page.getByRole("table", { name: "Rigs" }).getByRole("link", { name, exact: true }),
	);
	await expectURL(page, "/inventory/rigs/:slug", { slug: rigSlug });
	await expect(page.getByRole("link", { name: "P&ID", exact: true })).toBeVisible();
});
