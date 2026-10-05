import { href } from "react-router";

import { expect, expectURL, test } from "../fixtures.ts";

test("a record-only user can be added", async ({ page }) => {
	const suffix = crypto.randomUUID();
	const name = `Record-only user ${suffix}`;
	const email = `record-only-${suffix}@example.test`;

	await page.goto(href("/users"));
	await page.getByLabel("Name").fill(name);
	await page.getByLabel("Email").fill(email);
	await page.getByRole("button", { name: "Add user" }).click();

	await expectURL(page, "/users");

	const row = page.getByRole("listitem").filter({ hasText: name });
	await expect(row).toContainText(email);
	await expect(row).toContainText("Record only");
});
