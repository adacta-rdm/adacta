/**
 * Repository scope.
 *
 * The sidebar is shared by every section. The inventory tree is therefore loaded here
 * rather than inside the inventory section.
 */

import { asc, isNull } from "drizzle-orm";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

import { services } from "~/app/.server/context";
import { RepositoryFileDropTarget } from "~/app/components/RepositoryFileDropTarget";
import { AppLayout } from "~/app/layout/AppLayout";
import { appendUniqueFiles } from "~/app/lib/appendUniqueFiles";
import { groupBatchesByComposition } from "~/app/lib/batchComposition";
import { groupByLocation } from "~/app/lib/location";
import { sidebarWidthFromCookie } from "~/app/lib/sidebarWidth";
import { sessionAuth } from "~/app/middleware/authentication";
import { repositoryAccess } from "~/app/middleware/repositoryAccess";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { InventoryEntry as InventoryEntryTable } from "~/drizzle/schema/repo.InventoryEntry";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";

import type { Route } from "./+types/$repo";

/**
 * Authenticate, then bind the repository, before any loader runs.
 */
export const middleware: Route.MiddlewareFunction[] = [sessionAuth, repositoryAccess];

export function loader({ context, request }: Route.LoaderArgs) {
	const container = context.get(services);
	const [access, db] = container.get(RepoAccess, RepoDB);

	const entries = db
		.select()
		.from(InventoryEntryTable)
		.where(isNull(InventoryEntryTable.metadataArchivedAt))
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

	const batches = db
		.select()
		.from(SampleBatch)
		.where(isNull(SampleBatch.metadataArchivedAt))
		.orderBy(asc(SampleBatch.name))
		.all();

	return {
		sidebarWidth: sidebarWidthFromCookie(request.headers.get("cookie")),
		repository: access.repository,
		entries,
		buildings: groupByLocation(entries),
		batchGroups: groupBatchesByComposition(batches),
	};
}

export type RepositoryContext = {
	sourceBundle: File[];
	addSourceFiles: (files: File[]) => void;
	removeSourceFile: (file: File) => void;
	clearSourceFiles: () => void;
};

export default function Repository({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const [pendingBundle, setPendingBundle] = useState<{
		repository: string;
		files: File[];
	}>();
	const sourceBundle =
		pendingBundle?.repository === loaderData.repository ? pendingBundle.files : [];

	function addSourceFiles(files: File[]) {
		setPendingBundle((current) => ({
			repository: loaderData.repository,
			files: appendUniqueFiles(
				current?.repository === loaderData.repository ? current.files : [],
				files,
			),
		}));
	}

	function removeSourceFile(file: File) {
		setPendingBundle((current) => {
			if (current?.repository !== loaderData.repository) return current;
			const files = current.files.filter((candidate) => candidate !== file);
			return files.length > 0 ? { ...current, files } : undefined;
		});
	}

	function clearSourceFiles() {
		setPendingBundle(undefined);
	}

	function importSourceFiles(files: File[]) {
		addSourceFiles(files);

		const importPath = `/${loaderData.repository}/files/import`;
		if (location.pathname !== importPath) void navigate(importPath);
	}

	const context: RepositoryContext = {
		sourceBundle,
		addSourceFiles,
		removeSourceFile,
		clearSourceFiles,
	};

	return (
		<RepositoryFileDropTarget onDropFiles={importSourceFiles}>
			<AppLayout
				sidebarWidth={loaderData.sidebarWidth}
				repository={loaderData.repository}
				buildings={loaderData.buildings}
				batchGroups={loaderData.batchGroups}
			>
				<Outlet context={context} />
			</AppLayout>
		</RepositoryFileDropTarget>
	);
}
