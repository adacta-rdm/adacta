import { Link } from "react-router";

import { listRepositories } from "~/app/data/repositories.server";
import { Heading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";

import type { Route } from "./+types/_index";

export function meta() {
	return [{ title: "Repositories — Adacta" }];
}

export function loader() {
	return { repositories: listRepositories() };
}

export default function Home({ loaderData }: Route.ComponentProps) {
	return (
		<div className="mx-auto max-w-2xl p-8">
			<Heading>Repositories</Heading>
			<Text className="mt-1">Choose a repository to work in.</Text>

			<ul className="mt-6 space-y-2">
				{loaderData.repositories.map((repository) => (
					<li key={repository.id}>
						<Link
							to={`/${repository.slug}`}
							className="block rounded-lg px-4 py-3 ring-1 ring-zinc-950/10 hover:bg-zinc-50 dark:ring-white/10 dark:hover:bg-zinc-800"
						>
							{repository.name}
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
