import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { chromium, expect, type FullConfig, type Page } from "@playwright/test";

import { seedInventoryEntry, seedSampleBatch, seedUser } from "./seed-data.ts";
import { AUTH_STATE_PATH } from "./settings.ts";

const user = seedUser("dev");

/**
 * Visit one route and wait for its main heading. This compiles the server and
 * browser modules used by that route before a development test starts.
 */
async function warmRoute(page: Page, path: string, heading: string): Promise<void> {
	await page.goto(path, { waitUntil: "domcontentloaded", timeout: 90_000 });
	await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

/**
 * Create the authenticated browser state used by the normal journeys. A local
 * run also visits each tested route once because Vite compiles routes on first
 * use.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
	const baseURL = config.projects[0]?.use.baseURL;
	if (typeof baseURL !== "string") throw new Error("Playwright baseURL is not configured.");

	const browser = await chromium.launch();

	try {
		const page = await browser.newPage({ baseURL });

		await page.goto("/login", { waitUntil: "domcontentloaded" });

		// The server renders the form before its client submit handler is ready.
		// Network inactivity shows that the client modules have loaded.
		await page.waitForLoadState("networkidle");

		await page.getByLabel("Email").fill(user.email);
		await page.getByLabel("Password").fill(user.password);

		await Promise.all([
			page.waitForURL((url) => url.pathname === "/"),
			page.getByRole("button", { name: "Sign in" }).click(),
		]);

		await expect(page.getByRole("heading", { name: "Repositories" })).toBeVisible();

		mkdirSync(dirname(AUTH_STATE_PATH), { recursive: true });
		await page.context().storageState({ path: AUTH_STATE_PATH });

		if (process.env.CI) return;

		for (const [path, heading] of [
			["/demo/inventory", "Inventory"],
			["/demo/samples", "Samples"],
			["/demo/samples/new", "Create sample batch"],
			["/demo/catalog", "Catalog"],
			["/demo/files/import", "Import files"],
		] as const) {
			await warmRoute(page, path, heading);
		}

		// Dynamic routes are opened through links because their identifiers belong
		// to the application.
		const inventoryEntry = seedInventoryEntry("ammonia-synthesis-rig");
		await warmRoute(page, "/demo/inventory", "Inventory");
		await page
			.getByRole("list", { name: "Inventory by location" })
			.getByRole("link", { name: inventoryEntry.name })
			.click();
		await expect(page.getByRole("heading", { name: inventoryEntry.name })).toBeVisible();

		const batch = seedSampleBatch("ni-al2o3-2024a");
		await warmRoute(page, "/demo/samples", "Samples");
		await page
			.getByRole("tree", { name: "Batches by composition" })
			.getByRole("link", { name: batch.name, exact: true })
			.click();
		await expect(page.getByRole("heading", { name: batch.name })).toBeVisible();
	} finally {
		await browser.close();
	}
}
