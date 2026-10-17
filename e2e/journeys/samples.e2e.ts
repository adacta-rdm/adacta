import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";
import { href } from "react-router";

import { expect, expectURL, followLink, test } from "../fixtures.ts";
import { seedSampleBatch, seedUser } from "../seed-data.ts";

const nickelBatch = seedSampleBatch("ni-al2o3-2024a");
const platinumBatch = seedSampleBatch("pt-al2o3-2024a");

const batchTree = (page: Page) => page.getByRole("tree", { name: "Batches by composition" });

test("the samples section lists the seeded batches", async ({ page }) => {
	await page.goto(href("/samples"));

	const table = page.getByRole("table");
	await expect(table.getByRole("link", { name: nickelBatch.name, exact: true })).toBeVisible();
	await expect(table.getByRole("link", { name: platinumBatch.name, exact: true })).toBeVisible();
});

test("a batch opens from the sample tree", async ({ page }) => {
	await page.goto(href("/samples"));

	const link = batchTree(page).getByRole("link", { name: nickelBatch.name, exact: true });
	await followLink(page, link);

	await expect(page.getByRole("heading", { name: nickelBatch.name })).toBeVisible();
});

test("a sample added to a seeded batch appears in its table", async ({ page }) => {
	const preparer = seedUser("gossler");

	await page.goto(href("/samples"));
	const link = batchTree(page).getByRole("link", { name: nickelBatch.name, exact: true });
	const batchURL = await followLink(page, link);

	const label = page.getByLabel("Sample label");
	const sampleName = await label.inputValue();
	await page.getByRole("combobox", { name: "Prepared by" }).fill(preparer.name);
	await page.getByRole("option", { name: preparer.name, exact: true }).click();
	await page.getByRole("button", { name: "Add", exact: true }).click();

	await expectURL(page, batchURL);
	const row = page.getByRole("row").filter({ has: page.getByText(sampleName, { exact: true }) });
	await expect(row).toContainText(preparer.name);
});

test("a new batch can be created and found", async ({ page }, testInfo) => {
	const name = `E2E Batch ${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`;
	const preparer = seedUser("riedel");

	await page.goto(href("/samples/new"));
	await page.getByLabel("Batch name").fill(name);
	await page.getByLabel("Preparation date").fill("2026-09-15");
	await page.getByRole("combobox", { name: "Prepared by" }).fill(preparer.name);
	await page.getByRole("option", { name: preparer.name, exact: true }).click();
	await page.getByRole("button", { name: "Create batch" }).click();

	await expect(page.getByRole("heading", { name })).toBeVisible();
	await expect(page).toHaveURL((url) => url.pathname.startsWith("/samples/"));
	await expect(page.getByRole("main")).toContainText(preparer.name);

	await page.goto(href("/samples"));
	await expect(page.getByRole("table").getByRole("link", { name, exact: true })).toBeVisible();
});
