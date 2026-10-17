import { asc } from "drizzle-orm";

import { services } from "~/app/.server/context.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";

import type { Route } from "./+types/api.users.ts";

export async function loader({ context }: Route.LoaderArgs) {
	const db = context.get(services).get(ApplicationDatabase);
	const users = await db
		.select({ id: User.id, name: User.name })
		.from(User)
		.orderBy(asc(User.name), asc(User.id))
		.all();

	return { users };
}
