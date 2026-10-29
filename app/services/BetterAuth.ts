import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { and, eq, like } from "drizzle-orm";

import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { EmailSender } from "~/app/services/EmailSender.ts";
import { accountEmail } from "~/app/services/accountEmail.ts";
import {
	Account,
	authRelations,
	Session,
	User,
	Verification,
} from "~/drizzle/schema/BetterAuth.ts";
import { Env } from "~/lib/env/Env.ts";
import { Logger } from "~/lib/logger/Logger.ts";
import { service } from "~/lib/service-container/ServiceContainer.ts";

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
 * The container builds it once per scope from the application database.
 *
 * Better Auth stores the passwords. The user table has no password column of
 * its own.
 *
 * The base URL is configured rather than read from each request. Without it
 * Better Auth takes the origin from the Host header. A client controls that
 * header.
 */
export const BetterAuth = service(
	ApplicationDatabase,
	Logger,
	Env,
	EmailSender,
)((db, logger, env, mail) => {
	return betterAuth({
		baseURL: env.url("ADACTA_URL", "http://localhost:5173").toString(),

		secret:
			import.meta.env.NODE_ENV === "production"
				? env.string("ADACTA_AUTH_SECRET")
				: env.string("ADACTA_AUTH_SECRET", DEVELOPMENT_SECRET),

		user: {
			additionalFields: { role: { type: ["user", "admin"], defaultValue: "user", input: false } },
		},
		emailAndPassword: {
			enabled: true,
			disableSignUp: true,
			resetPasswordTokenExpiresIn: 60 * 60,
			revokeSessionsOnPasswordReset: true,
			async sendResetPassword({ user, token, url }) {
				const identifier = `reset-password:${token}`;
				// The callback checks the token before redirecting to our password form.
				const callback = new URL(url);
				callback.searchParams.set(
					"callbackURL",
					new URL("/reset-password", env.url("ADACTA_URL", "http://localhost:5173")).toString(),
				);
				try {
					await mail.send(accountEmail(user.email, callback.toString(), false));
				} catch {
					await db.delete(Verification).where(eq(Verification.identifier, identifier));
					// Do not include transport exceptions: they can contain credentials or message bodies.
					logger.error("Password recovery email could not be sent. Check SMTP configuration.");
				}
			},
			async onPasswordReset({ user }) {
				// Other recovery links must not remain usable after the password changes.
				await db.batch([
					db.update(User).set({ emailVerified: true }).where(eq(User.id, user.id)),
					db
						.delete(Verification)
						.where(
							and(
								eq(Verification.value, user.id),
								like(Verification.identifier, "reset-password:%"),
							),
						),
				]);
			},
		},
		hooks: {
			before: createAuthMiddleware(async (ctx) => {
				if (ctx.path !== "/request-password-reset") return;
				const email =
					typeof ctx.body?.email === "string" ? ctx.body.email.trim().toLowerCase() : "";
				const user = await db
					.select({ id: User.id, credentialId: Account.id })
					.from(User)
					.leftJoin(Account, and(eq(Account.userId, User.id), eq(Account.providerId, "credential")))
					.where(eq(User.email, email))
					.get();
				if (!user || user.credentialId) return;

				// Better Auth issues a recovery token for any known user. A record-only
				// user must instead receive an invitation from an administrator.
				// For an unknown email, Better Auth looks up the user, generates a
				// random ID, and looks up a dummy verification token. Do the same
				// work here to make response times less revealing of which emails
				// belong to record-only users. No recovery token is stored.
				await ctx.context.internalAdapter.findUserByEmail(email, { includeAccounts: true });
				crypto.randomUUID();
				await ctx.context.internalAdapter.findVerificationValue("dummy-verification-token");
				return ctx.json({
					status: true,
					message: "If this email exists in our system, check your email for the reset link",
				});
			}),
		},

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

export type BetterAuth = ReturnType<typeof BetterAuth>;
