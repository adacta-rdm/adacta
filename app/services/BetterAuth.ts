import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";

import { SystemDB } from "~/app/services/SystemDB";
import {
	Account,
	authRelations,
	Session,
	User,
	Verification,
} from "~/drizzle/schema/system.BetterAuth";
import { service } from "~/lib/serviceContainer/ServiceContainer";

/**
 * The configured Better Auth server.
 *
 * The container builds it once per scope from the system database.
 *
 * Better Auth stores the passwords. The user table has no password column of
 * its own.
 */
export const BetterAuth = service(SystemDB)((db) => {
	return betterAuth({
		emailAndPassword: { enabled: true },

		advanced: { database: { joins: true } },

		database: drizzleAdapter(db, {
			provider: "sqlite",

			schema: {
				user: User,
				session: Session,
				account: Account,
				verification: Verification,
				authRelations,
			},
		}),
	});
});

// export const auth = ServiceContainer.get(BetterAuth);

export type BetterAuth = ReturnType<typeof BetterAuth>;
