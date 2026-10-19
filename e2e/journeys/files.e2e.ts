import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { href } from "react-router";

import { expect, expectURL, followLink, test } from "../fixtures.ts";
import { seedInventoryEntry } from "../seed-data.ts";

test("files uploaded together appear in one upload", async ({ page }, testInfo) => {
	const suffix = `${testInfo.workerIndex}-${randomUUID().slice(0, 8)}`;
	const notesName = `notes-${suffix}.txt`;
	const readmeName = `readme-${suffix}.md`;
	const notes = Buffer.from("Check the reactor connections before starting.\n");

	await page.goto(href("/files/import"));
	await page.getByLabel(/Drop files here/).setInputFiles([
		{ name: notesName, mimeType: "text/plain", buffer: notes },
		{ name: readmeName, mimeType: "text/markdown", buffer: Buffer.from("# Run notes\n") },
	]);
	await page.getByRole("button", { name: "Upload files", exact: true }).click();

	await page.waitForURL(/\/files\/\d+$/);
	const uploadId = new URL(page.url()).pathname.split("/")[2]!;
	await expectURL(page, "/files/:uploadId", { uploadId });
	await expect(page.getByRole("heading", { name: "Uploaded files", exact: true })).toBeVisible();
	await expect(page.getByText(notesName, { exact: true })).toBeVisible();
	await expect(page.getByText(readmeName, { exact: true })).toBeVisible();

	const download = page.getByRole("link", { name: `Download ${notesName}`, exact: true });
	const originalURL = await download.getAttribute("href");
	expect(originalURL).toBeTruthy();
	const response = await page.request.get(originalURL!);
	expect(response.ok()).toBe(true);
	expect(await response.body()).toEqual(notes);

	// Both names must occur in the same link so another worker's upload cannot match.
	await page.goto(href("/files"));
	const upload = page
		.getByRole("link")
		.filter({ hasText: notesName })
		.filter({ hasText: readmeName });
	await followLink(page, upload);
	await expectURL(page, "/files/:uploadId", { uploadId });
});

test("an uploaded CSV and sidecar become a dataset", async ({ page }) => {
	const rig = seedInventoryEntry("methanation-test-stand");
	const csvName = "methanation-run.csv";

	await page.goto(href("/files/import"));
	await page
		.getByLabel(/Drop files here/)
		.setInputFiles([
			fileURLToPath(new URL(`../files/${csvName}`, import.meta.url)),
			fileURLToPath(new URL("../files/methanation-run.toml", import.meta.url)),
		]);
	await page.getByRole("button", { name: "Continue", exact: true }).click();

	await page.waitForURL(/\/files\/\d+\/datasets\/import$/);
	const uploadId = new URL(page.url()).pathname.split("/")[2]!;
	await expectURL(page, "/files/:uploadId/datasets/import", { uploadId });
	await page.getByRole("combobox", { name: /^Rig\b/ }).selectOption({ label: rig.name });

	// Selecting a rig reloads the page with the rig in its address. Only then does
	// the import form carry the rig.
	await page.waitForURL((url) => url.searchParams.has("rigSlug"));
	await page.getByRole("button", { name: "Import dataset", exact: true }).click();

	await page.waitForURL(/\/files\/datasets\/\d+$/);
	const datasetId = new URL(page.url()).pathname.split("/")[3]!;
	await expectURL(page, "/files/datasets/:datasetId", { datasetId });
	await expect(page.getByRole("heading", { name: csvName, exact: true })).toBeVisible();
});
