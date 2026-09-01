import { isNull } from "drizzle-orm";
import { Outlet } from "react-router";

import { services } from "~/app/.server/context";
import { AppLayout } from "~/app/layout/AppLayout";
import { sessionAuth } from "~/app/middleware/authentication";
import { repositoryAccess } from "~/app/middleware/repositoryAccess";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { groupByLocation } from "~/app/utils/location";
import { InventoryEntry as InventoryEntryTable } from "~/drizzle/schema/repo.InventoryEntry";

import type { Route } from "./+types/$repo";

/**
 * Repository scope.
 *
 * The sidebar is shared by every section. The inventory tree is therefore loaded here
 * rather than inside the inventory section.
 */
/**
 * Authenticate, then bind the repository, before any loader runs.
 */
export const middleware: Route.MiddlewareFunction[] = [sessionAuth, repositoryAccess];

export function loader({ context }: Route.LoaderArgs) {
	const [access, db] = context.get(services).get(RepoAccess, RepoDB);

	const entries = db
		.select()
		.from(InventoryEntryTable)
		.where(isNull(InventoryEntryTable.metadataDeletedAt))
		.all()
		.map((row) => ({
			id: row.id,
			name: row.name,
			kind: row.kind,
			location: {
				building: row.locationBuildingIdentifier,
				room: row.locationRoomIdentifier,
				label: row.locationLabel,
			},
		}));

	return { repository: access.repository, entries, buildings: groupByLocation(entries) };
}

export default function Repository({ loaderData }: Route.ComponentProps) {
	return (
		<AppLayout repository={loaderData.repository} buildings={loaderData.buildings}>
			<Outlet />
		</AppLayout>
	);
}
