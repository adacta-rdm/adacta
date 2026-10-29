import { and, eq, sql } from "drizzle-orm";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";

export type UserRole = "user" | "admin";

export class UserRoleError extends Error {}

@Service(ApplicationDatabase, Security)
export class UserAccess {
	constructor(
		private db: ApplicationDatabase,
		private security: Security,
	) {}

	async isAdmin(): Promise<boolean> {
		const user = await this.db
			.select({ role: User.role })
			.from(User)
			.where(eq(User.id, this.security.userId))
			.get();
		return user?.role === "admin";
	}

	async requireAdmin(): Promise<void> {
		if (!(await this.isAdmin()))
			throw new Response("Administrator access is required.", { status: 403 });
	}

	/**
	 * Trusted server operation, also used by the provisioning CLI. Routes must requireAdmin first.
	 */
	async setRole(userId: string, role: UserRole): Promise<void> {
		const [result] = await this.db.batch([
			this.db
				.update(User)
				.set({ role })
				.where(
					and(
						eq(User.id, userId),
						role === "user"
							? sql`(${User.role} != 'admin' OR (SELECT count(*) FROM "User" WHERE "role" = 'admin') > 1)`
							: undefined,
					),
				),
		]);
		if (!result.changes)
			throw new UserRoleError("User was not found, or this is the last administrator.");
	}
}
