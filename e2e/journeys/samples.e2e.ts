import { randomUUID } from "node:crypto";

import type { Page } from "@playwright/test";
import { href } from "react-router";

import { expect, expectURL, followLink, test } from "../fixtures.ts";
import { seedSampleBatch } from "../seed-data.ts";

const nickelBatch = seedSampleBatch("ni-al2o3-2024a");
const platinumBatch = seedSampleBatch("pt-al2o3-2024a");

const batchTree = (page: Page) => page.getByRole("tree", { name: "Batches by composition" });

test("the samples section lists the seeded batches", async ({ page, repo }) => {
	await page.goto(href("/:repo/samples", { repo }));

	const table = page.getByRole("table");
	await expect(table.getByRole("link", { name: nickelBatch.name, exact: true })).toBeVisible();
	await expect(table.getByRole("link", { name: platinumBatch.name, exact: true })).toBeVisible();
});

test("a batch opens from the sample tree", async ({ page, repo }) => {
	await page.goto(href("/:repo/samples", { repo }));

	const link = batchTree(page).getByRole("link", { name: nickelBatch.name, exact: true });
	await followLink(page, link);

	await expect(page.getByRole("heading", { name: nickelBatch.name })).toBeVisible();
});

test("a sample added to a seeded batch appears in its table", async ({ page, repo }) => {
	await page.goto(href("/:repo/samples", { repo }));
	const link = batchTree(page).getByRole("link", { name: nickelBatch.name, exact: true });
	const batchURL = await followLink(page, link);

	const label = page.getByLabel("Sample label");
	const sampleName = await label.inputValue();
	await page.getByRole("button", { name: "Add", exact: true }).click();

	await expectURL(page, batchURL);
	await expect(page.getByRole("table").getByText(sampleName, { exact: true })).toBeVisible();
});

test("a new batch can be created and found", async ({ page, repo }, testInfo) => {
	const name = `E2E Batch ${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`;

	await page.goto(href("/:repo/samples/new", { repo }));
	await page.getByLabel("Batch name").fill(name);
	await page.getByLabel("Preparation date").fill("2026-09-15");
	await page.getByRole("button", { name: "Create batch" }).click();

	await expect(page.getByRole("heading", { name })).toBeVisible();
	await expect(page).toHaveURL((url) => url.pathname.startsWith(`/${repo}/samples/`));

	await page.goto(href("/:repo/samples", { repo }));
	await expect(page.getByRole("table").getByRole("link", { name, exact: true })).toBeVisible();
});
