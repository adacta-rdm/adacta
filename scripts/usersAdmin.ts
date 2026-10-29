import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { parseArgs } from "node:util";

import { eq } from "drizzle-orm";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { UserAccess } from "~/app/services/UserAccess.ts";
import { UserProvisioning } from "~/app/services/UserProvisioning.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

export async function usersAdmin(args: string[], container: ServiceContainer): Promise<void> {
	const [command, ...options] = args;
	const { values } = parseArgs({
		args: options,
		options: {
			email: { type: "string" },
			name: { type: "string" },
			role: { type: "string" },
		},
	});
	if (!values.email || (command !== "create" && command !== "role")) {
		throw new Error(
			"Usage: bun run users:admin create --email EMAIL --name NAME | role --email EMAIL --role admin|user",
		);
	}
	if (command === "create") {
		if (!values.name) throw new Error("--name is required.");
		if (!stdin.isTTY)
			throw new Error("Admin creation requires an interactive terminal for the password.");
		// Readline's terminal output contains typed characters. Suppress that output,
		// while writing prompts directly, so passwords never appear in logs or argv.
		const output = new Writable({
			write(_chunk, _encoding, callback) {
				callback();
			},
		});
		const terminal = createInterface({ input: stdin, output, terminal: true });
		let password: string;
		try {
			stdout.write("Password: ");
			password = await terminal.question("");
			stdout.write("\nConfirm password: ");
			const confirmation = await terminal.question("");
			stdout.write("\n");
			if (password !== confirmation) throw new Error("Passwords do not match.");
		} finally {
			terminal.close();
		}
		await container
			.get(UserProvisioning)
			.create({ name: values.name, email: values.email, password, role: "admin" });
		console.log(`Administrator created: ${values.email}`);
	} else {
		if (values.role !== "admin" && values.role !== "user")
			throw new Error("--role must be admin or user.");
		const user = await container
			.get(ApplicationDatabase)
			.select({ id: User.id })
			.from(User)
			.where(eq(User.email, values.email.trim().toLowerCase()))
			.get();
		if (!user) throw new Error("User was not found.");
		await container.get(UserAccess).setRole(user.id, values.role);
		console.log(`Role updated: ${values.email} (${values.role})`);
	}
}
