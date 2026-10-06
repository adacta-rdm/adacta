import { href } from "react-router";

import { expect, expectURL, followLink, test } from "../fixtures.ts";
import { seedInventoryEntry } from "../seed-data.ts";

test("the home page opens the inventory", async ({ page }) => {
	await page.goto("/");

	await expectURL(page, "/inventory");
	await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
});

test("seeded entries appear in the inventory tree", async ({ page }) => {
	await page.goto(href("/inventory"));

	const inventory = page.getByRole("list", { name: "Inventory by location" });
	for (const key of ["ammonia-synthesis-rig", "analytical-balance-xs205"]) {
		await expect(inventory.getByRole("link", { name: seedInventoryEntry(key).name })).toBeVisible();
	}
});

test("an inventory entry opens from the inventory tree", async ({ page }) => {
	const entry = seedInventoryEntry("ammonia-synthesis-rig");

	await page.goto(href("/inventory"));
	const link = page
		.getByRole("list", { name: "Inventory by location" })
		.getByRole("link", { name: entry.name });

	await followLink(page, link);
	await expect(page.getByRole("heading", { name: entry.name })).toBeVisible();
});

test("the main application sections open", async ({ page }) => {
	for (const [route, heading] of [
		["/catalog", "Catalog"],
		["/inventory", "Inventory"],
		["/samples", "Samples"],
		["/files/import", "Import files"],
		["/users", "Users"],
	] as const) {
		await page.goto(href(route));
		await expectURL(page, route);
		await expect(page.getByRole("heading", { name: heading, exact: true, level: 1 })).toBeVisible();
	}
});
