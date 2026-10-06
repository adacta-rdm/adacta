import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

import { chromium, expect, type FullConfig } from "@playwright/test";

import { seedUser } from "./seed-data.ts";
import { AUTH_STATE_PATH } from "./settings.ts";

const user = seedUser("dev");

/**
 * Create the authenticated browser state used by the normal journeys.
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
			page.waitForURL((url) => url.pathname === "/inventory"),
			page.getByRole("button", { name: "Sign in" }).click(),
		]);

		await expect(page.getByRole("heading", { name: "Inventory" })).toBeVisible();

		mkdirSync(dirname(AUTH_STATE_PATH), { recursive: true });
		await page.context().storageState({ path: AUTH_STATE_PATH });
	} finally {
		await browser.close();
	}
}
