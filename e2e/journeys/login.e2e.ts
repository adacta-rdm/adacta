import type { Page } from "@playwright/test";

import { currentAuthUser, expect, expectURL, test } from "../fixtures.ts";
import { seedUser } from "../seed-data.ts";

const user = seedUser("riedel");

test.use({ storageState: { cookies: [], origins: [] } });

/**
 * Open the login page and wait for its client code. The server renders the
 * form before its submit handler is ready.
 */
async function openLoginPage(page: Page): Promise<void> {
	await page.goto("/login", { waitUntil: "domcontentloaded" });
	await page.waitForLoadState("networkidle");
	await page.getByRole("button", { name: "Sign in" }).waitFor();
}

test("valid credentials start a real session", async ({ page, request }) => {
	expect(await currentAuthUser(request)).toBeNull();

	await openLoginPage(page);
	await page.getByLabel("Email").fill(user.email);
	await page.getByLabel("Password").fill(user.password);
	await page.getByRole("button", { name: "Sign in" }).click();

	await expectURL(page, "/");
	await expect(page.getByRole("heading", { name: "Repositories" })).toBeVisible();

	const signedInUser = await currentAuthUser(page.request);
	expect(signedInUser?.email).toBe(user.email);
});

test("the sign-in form rejects a wrong password", async ({ page }) => {
	await openLoginPage(page);
	await page.getByLabel("Email").fill(user.email);
	await page.getByLabel("Password").fill("not-the-password");

	const response = page.waitForResponse(
		(candidate) => new URL(candidate.url()).pathname === "/api/auth/sign-in/email",
	);

	await page.getByRole("button", { name: "Sign in" }).click();
	expect((await response).status()).toBeGreaterThanOrEqual(400);

	await expectURL(page, "/login");
	await expect(page.getByRole("alert")).toBeVisible();
});
