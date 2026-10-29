import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "better-auth/db";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import type { UserRole } from "~/app/services/UserAccess.ts";
import { Account, User } from "~/drizzle/schema/BetterAuth.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";

/**
 * Trusted provisioning for seeds, tests, and the operator CLI; never exposed by HTTP.
 */
@Service(ApplicationDatabase)
export class UserProvisioning {
	constructor(private db: ApplicationDatabase) {}

	async create({
		name,
		email,
		password,
		role = "user",
	}: {
		name: string;
		email: string;
		password: string;
		role?: UserRole;
	}): Promise<string> {
		email = email.trim().toLowerCase();
		if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
			throw new Error("A name and valid email are required.");
		if (password.length < 8 || password.length > 128)
			throw new Error("Password must contain 8 to 128 characters.");
		const id = crypto.randomUUID();
		const now = new Date();
		const hash = await hashPassword(password);
		await this.db.batch([
			this.db.insert(User).values({
				id,
				name: name.trim(),
				email,
				role,
				emailVerified: true,
				createdAt: now,
				updatedAt: now,
			}),
			this.db.insert(Account).values({
				id: crypto.randomUUID(),
				userId: id,
				accountId: id,
				providerId: "credential",
				issuer: createLocalAccountIssuer("credential"),
				password: hash,
				createdAt: now,
				updatedAt: now,
			}),
		]);
		return id;
	}
}
