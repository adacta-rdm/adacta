import { Outlet } from "react-router";

import { listInventory } from "~/app/data/inventory.server";
import { findRepository } from "~/app/data/repositories.server";
import { groupByLocation } from "~/app/data/types";
import { AppLayout } from "~/app/layout/AppLayout";

import type { Route } from "./+types/$repo";

/**
 * Repository scope.
 *
 * The sidebar is shared by every section. The inventory tree is therefore loaded here
 * rather than inside the inventory section.
 */
export function loader({ params }: Route.LoaderArgs) {
	const repository = params.repo ? findRepository(params.repo) : undefined;

	if (!repository) {
		throw new Response("Repository not found", { status: 404 });
	}

	const entries = listInventory(repository.slug);

	return { repository, entries, buildings: groupByLocation(entries) };
}

export default function Repository({ loaderData }: Route.ComponentProps) {
	return (
		<AppLayout repository={loaderData.repository} buildings={loaderData.buildings}>
			<Outlet />
		</AppLayout>
	);
}
