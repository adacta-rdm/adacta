import { describe, expect, test } from "bun:test";

import { eq } from "drizzle-orm";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { BetterAuth } from "~/app/services/BetterAuth.ts";
import { UserProvisioning } from "~/app/services/UserProvisioning.ts";
import { setupEmptyTestDatabaseEnvironment } from "~/app/testUtils/testUtils.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Env } from "~/lib/env/Env.ts";

describe("operator provisioning", () => {
	test.each([true, false])(
		"creates an admin only when passwords match (match=%s)",
		async (match) => {
			const scope = await setupEmptyTestDatabaseEnvironment();
			let output = "";
			let prompt = 0;
			const password = "operator-secret-password";

			const child = Bun.spawn(
				[
					"bun",
					"scripts/cli.ts",
					"users:admin",
					"create",
					"--email",
					"new@example.com",
					"--name",
					"Operator",
				],
				{
					env: { ...process.env, ...scope.get(Env).values },
					terminal: {
						data(terminal, chunk) {
							output += new TextDecoder().decode(chunk);
							if (prompt === 0 && output.includes("Password: ")) {
								prompt = 1;
								terminal.write(`${password}\n`);
							}
							if (prompt === 1 && output.includes("Confirm password: ")) {
								prompt = 2;
								terminal.write(`${match ? password : "different-password"}\n`);
							}
						},
					},
				},
			);
			const code = await child.exited;
			child.terminal?.close();

			expect(code === 0).toBe(match);
			expect(output).not.toContain(password);
			expect(output).not.toContain("different-password");
			if (match) {
				const session = await scope.get(BetterAuth).api.signInEmail({
					body: { email: "new@example.com", password },
				});
				expect(session.user.role).toBe("admin");
			} else {
				expect(output).toContain("Passwords do not match.");
				expect(await scope.get(ApplicationDatabase).select().from(User)).toHaveLength(0);
			}
		},
	);

	test("requires a terminal to create an administrator", async () => {
		const scope = await setupEmptyTestDatabaseEnvironment();
		const child = Bun.spawn(
			[
				"bun",
				"scripts/cli.ts",
				"users:admin",
				"create",
				"--email",
				"new@example.com",
				"--name",
				"Operator",
			],
			{
				env: { ...process.env, ...scope.get(Env).values },
				stdin: "pipe",
				stdout: "pipe",
				stderr: "pipe",
			},
		);

		const [code, error] = await Promise.all([child.exited, new Response(child.stderr).text()]);

		expect(code).not.toBe(0);
		expect(error).toContain("requires an interactive terminal");
	});

	test("trusted provisioning creates an admin who can sign in with public signup disabled", async () => {
		const scope = await setupEmptyTestDatabaseEnvironment();
		const id = await scope.get(UserProvisioning).create({
			name: "Operator",
			email: "ADMIN@example.com",
			password: "operator-password",
			role: "admin",
		});
		const session = await scope
			.get(BetterAuth)
			.api.signInEmail({ body: { email: "admin@example.com", password: "operator-password" } });
		expect(session.user).toMatchObject({ id, role: "admin" });
		await expect(
			scope
				.get(UserProvisioning)
				.create({ name: "Duplicate", email: "admin@example.com", password: "other-password" }),
		).rejects.toThrow();
		expect(await scope.get(ApplicationDatabase).select().from(User)).toHaveLength(1);
	});

	test("the CLI promotes an existing user and rejects demoting the last admin", async () => {
		const scope = await setupEmptyTestDatabaseEnvironment();
		const id = await scope
			.get(UserProvisioning)
			.create({ name: "Operator", email: "operator@example.com", password: "operator-password" });
		async function role(value: string) {
			const child = Bun.spawn(
				[
					"bun",
					"scripts/cli.ts",
					"users:admin",
					"role",
					"--email",
					"OPERATOR@example.com",
					"--role",
					value,
				],
				{
					env: { ...process.env, ...scope.get(Env).values },
					stdout: "pipe",
					stderr: "pipe",
				},
			);
			const [code, output, error] = await Promise.all([
				child.exited,
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
			]);
			return { code, text: output + error };
		}
		expect((await role("admin")).code).toBe(0);
		expect(
			(await scope.get(ApplicationDatabase).select().from(User).where(eq(User.id, id)).get())?.role,
		).toBe("admin");
		const rejected = await role("user");
		expect(rejected.code).not.toBe(0);
		expect(rejected.text).toContain("last administrator");
		expect((await role("owner")).code).not.toBe(0);
	});
});
