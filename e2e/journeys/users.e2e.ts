import { href } from "react-router";

import { expect, expectURL, test } from "../fixtures.ts";
import { MAIL_INBOX_URL } from "../mail-server.ts";

test("a record-only user can be added", async ({ page }) => {
	const suffix = crypto.randomUUID();
	const name = `Record-only user ${suffix}`;
	const email = `record-only-${suffix}@example.test`;

	await page.goto(href("/users"));
	const form = page.getByRole("region", { name: "Add record-only user" }).locator("form").last();
	await form.getByLabel("Name", { exact: true }).fill(name);
	await form.getByLabel("Email", { exact: true }).fill(email);
	await page.getByRole("button", { name: "Add user" }).click();

	await expectURL(page, "/users");

	const row = page.getByRole("listitem").filter({ hasText: name });
	await expect(row).toContainText(email);
	await expect(row).toContainText("Record only");
});

test("an invited user sets a password and signs in", async ({ page, browser, request }) => {
	const suffix = crypto.randomUUID();
	const email = `invited-${suffix}@example.test`;
	await page.goto(href("/users"));
	const invitation = page.getByRole("region", { name: "Invite user", exact: true });
	await invitation.getByLabel("Name", { exact: true }).fill(`Invitee ${suffix}`);
	await invitation.getByLabel("Email", { exact: true }).fill(email);
	await invitation.getByRole("button", { name: "Send invitation" }).click();
	await expect(invitation.getByRole("status")).toContainText("Invitation sent");
	const inbox = await request.get(`${MAIL_INBOX_URL}/?to=${encodeURIComponent(email)}`);
	expect(inbox.ok()).toBe(true);
	const { link } = (await inbox.json()) as { link: string };
	expect(link).toBeTruthy();
	const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
	try {
		const recipient = await context.newPage();
		await recipient.goto(link);
		await recipient.getByLabel("Password", { exact: true }).fill("invited-user-password");
		await recipient.getByLabel("Confirm password").fill("invited-user-password");
		await recipient.getByRole("button", { name: "Save password" }).click();
		await recipient.getByRole("link", { name: "Sign in", exact: true }).click();
		await recipient.getByLabel("Email", { exact: true }).fill(email);
		await recipient.getByLabel("Password", { exact: true }).fill("invited-user-password");
		await recipient.getByRole("button", { name: "Sign in", exact: true }).click();
		await expectURL(recipient, "/inventory");
	} finally {
		await context.close();
	}
});
