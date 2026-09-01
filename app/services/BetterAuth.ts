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
import { Env } from "~/lib/env/Env";
import { Logger } from "~/lib/logger/Logger";
import { service } from "~/lib/service-container/ServiceContainer";

/**
 * A secret is needed to sign cookies and tokens. Development uses this one. A
 * fresh clone therefore runs without configuration. Production reads
 * ADACTA_AUTH_SECRET and refuses to start without it. Anyone who knows the
 * secret can forge a session.
 */
const DEVELOPMENT_SECRET = "adacta-development-secret-not-for-production";

/**
 * The configured Better Auth server.
 *
 * The container builds it once per scope from the system database.
 *
 * Better Auth stores the passwords. The user table has no password column of
 * its own.
 *
 * The base URL is configured rather than read from each request. Without it
 * Better Auth takes the origin from the Host header. A client controls that
 * header.
 */
export const BetterAuth = service(
	SystemDB,
	Logger,
	Env,
)((db, logger, env) => {
	return betterAuth({
		baseURL: env.url("ADACTA_URL", "http://localhost:5173").toString(),

		secret:
			import.meta.env.NODE_ENV === "production"
				? env.string("ADACTA_AUTH_SECRET")
				: env.string("ADACTA_AUTH_SECRET", DEVELOPMENT_SECRET),

		emailAndPassword: { enabled: true },

		// Better Auth writes through the application logger. A test run therefore
		// stays quiet. A server keeps its messages in one place.
		logger: { level: "debug", log: (level, message) => logger[level](message) },

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
