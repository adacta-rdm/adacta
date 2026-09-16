import { eq } from "drizzle-orm";
import { Link } from "react-router";

import { services } from "~/app/.server/context.ts";
import { sessionAuth } from "~/app/middleware/authentication.ts";
import { Security } from "~/app/services/Security.ts";
import { SystemDB } from "~/app/services/SystemDB.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { Repository } from "~/drizzle/schema/system.Repository.ts";
import { UserRepository } from "~/drizzle/schema/system.UserRepository.ts";

import type { Route } from "./+types/_index.ts";

export function meta() {
	return [{ title: "Repositories — Adacta" }];
}

/**
 * The list is per user. A request without a session has nothing to show.
 */
export const middleware: Route.MiddlewareFunction[] = [sessionAuth];

export async function loader({ context }: Route.LoaderArgs) {
	const container = context.get(services);
	const [db, security] = container.get(SystemDB, Security);

	// A repository appears only when the user holds a grant for it.
	const repositories = await db
		.select({ slug: Repository.slug, name: Repository.name })
		.from(Repository)
		.innerJoin(UserRepository, eq(UserRepository.repositoryId, Repository.id))
		.where(eq(UserRepository.userId, security.userId))
		.orderBy(Repository.name)
		.all();

	return { repositories };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="mx-auto max-w-2xl p-8">
			<Heading>Repositories</Heading>

			{loaderData.repositories.length === 0 ? (
				<Text className="mt-1">
					You cannot open any repository yet. Ask an administrator for access.
				</Text>
			) : (
				<>
					<Text className="mt-1">Choose a repository to work in.</Text>

					<ul className="mt-6 space-y-2">
						{loaderData.repositories.map((repository) => (
							<li key={repository.slug}>
								<Link
									to={`/${repository.slug}`}
									className="block rounded-lg px-4 py-3 ring-1 ring-border hover:bg-surface-muted"
								>
									{repository.name}
								</Link>
							</li>
						))}
					</ul>
				</>
			)}
		</div>
	);
}
