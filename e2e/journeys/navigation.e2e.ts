import { href } from "react-router";

import { expect, expectURL, followLink, test } from "../fixtures.ts";
import { SEED_REPOSITORY, seedInventoryEntry } from "../seed-data.ts";

test("the repository can be opened from the home page", async ({ page, repo }) => {
	await page.goto("/");
	await page.getByRole("link", { name: SEED_REPOSITORY.name }).click();

	await expectURL(page, "/:repo/inventory", { repo });
	await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();
});

test("seeded entries appear in the inventory tree", async ({ page, repo }) => {
	await page.goto(href("/:repo/inventory", { repo }));

	const inventory = page.getByRole("list", { name: "Inventory by location" });
	for (const key of ["ammonia-synthesis-rig", "analytical-balance-xs205"]) {
		await expect(inventory.getByRole("link", { name: seedInventoryEntry(key).name })).toBeVisible();
	}
});

test("an inventory entry opens from the inventory tree", async ({ page, repo }) => {
	const entry = seedInventoryEntry("ammonia-synthesis-rig");

	await page.goto(href("/:repo/inventory", { repo }));
	const link = page
		.getByRole("list", { name: "Inventory by location" })
		.getByRole("link", { name: entry.name });

	await followLink(page, link);
	await expect(page.getByRole("heading", { name: entry.name })).toBeVisible();
});

test("the main repository sections open", async ({ page, repo }) => {
	for (const [route, heading] of [
		["/:repo/catalog", "Catalog"],
		["/:repo/inventory", "Inventory"],
		["/:repo/samples", "Samples"],
		["/:repo/files/import", "Import files"],
		["/:repo/users", "Users"],
	] as const) {
		await page.goto(href(route, { repo }));
		await expectURL(page, route, { repo });
		await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
	}
});
