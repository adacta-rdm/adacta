import { eq } from "drizzle-orm";
import { redirect, type MiddlewareFunction } from "react-router";

import { services } from "~/app/.server/context";
import { BetterAuth } from "~/app/services/BetterAuth";
import { Security } from "~/app/services/Security";
import { SystemDB } from "~/app/services/SystemDB";
import { User } from "~/drizzle/schema/system.BetterAuth";
import { Env } from "~/lib/env/Env";

/**
 * Establishes the request's user from its Better Auth session cookie.
 *
 * In development, ADACTA_DEV_USER may name the email of an existing user to
 * sign in as. This keeps the login step out of the way while working. Every
 * other request without a session is redirected to the login page.
 */
export const sessionAuth = (async ({ request, context }) => {
	const container = context.get(services);
	const [env, auth, security] = container.get(Env, BetterAuth, Security);

	const session = await auth.api.getSession({ headers: request.headers });

	if (session) {
		security.setCurrentUserId(session.user.id);
		return;
	}

	// The bypass is a development convenience and is never read in production.
	const devUserEmail =
		import.meta.env.NODE_ENV === "production"
			? undefined
			: env.string("ADACTA_DEV_USER", undefined);

	if (devUserEmail === undefined) {
		throw redirect("/login");
	}

	const user = container
		.get(SystemDB)
		.select({ id: User.id })
		.from(User)
		.where(eq(User.email, devUserEmail))
		.get();

	if (!user) {
		throw new Error(`ADACTA_DEV_USER "${devUserEmail}" was not found in the database.`);
	}

	security.setCurrentUserId(user.id);
}) satisfies MiddlewareFunction<Response>;
