/**
 * Every application section shares the sidebar.
 * Its inventory and sample trees are therefore loaded here.
 */

import { asc, isNull } from "drizzle-orm";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

import { services } from "~/app/.server/context.ts";
import { FileDropTarget } from "~/app/components/FileDropTarget.tsx";
import { PageBreadcrumbs } from "~/app/components/PageBreadcrumbs.tsx";
import { AppLayout } from "~/app/layout/AppLayout.tsx";
import { appendUniqueFiles } from "~/app/lib/appendUniqueFiles.ts";
import { groupBatchesByComposition } from "~/app/lib/batchComposition.ts";
import { groupByLocation } from "~/app/lib/location.ts";
import { sidebarWidthFromCookie } from "~/app/lib/sidebarWidth.ts";
import { sessionAuth } from "~/app/middleware/authentication.ts";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { InventoryEntry as InventoryEntryTable } from "~/drizzle/schema/InventoryEntry.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";

import type { Route } from "./+types/_app.ts";

/**
 * Authenticate before any application loader runs.
 */
export const middleware: Route.MiddlewareFunction[] = [sessionAuth];

export async function loader({ context, request }: Route.LoaderArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);

	const entries = (
		await db
			.select()
			.from(InventoryEntryTable)
			.where(isNull(InventoryEntryTable.metadataArchivedAt))
			.all()
	).map((row) => ({
		id: row.id,
		slug: row.slug,
		name: row.name,
		kind: row.kind,
		location: {
			building: row.locationBuildingIdentifier,
			room: row.locationRoomIdentifier,
			label: row.locationLabel,
		},
	}));

	const batches = await db
		.select()
		.from(SampleBatch)
		.where(isNull(SampleBatch.metadataArchivedAt))
		.orderBy(asc(SampleBatch.name))
		.all();

	return {
		sidebarWidth: sidebarWidthFromCookie(request.headers.get("cookie")),
		entries,
		buildings: groupByLocation(entries),
		batchGroups: groupBatchesByComposition(batches),
	};
}

export type AppContext = {
	selectedFiles: File[];
	addSelectedFiles: (files: File[]) => void;
	removeSelectedFile: (file: File) => void;
	clearSelectedFiles: () => void;
};

export default function App({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

	function addSelectedFiles(files: File[]) {
		setSelectedFiles((current) => appendUniqueFiles(current, files));
	}

	function removeSelectedFile(file: File) {
		setSelectedFiles((current) => current.filter((candidate) => candidate !== file));
	}

	function clearSelectedFiles() {
		setSelectedFiles([]);
	}

	// Add files dropped in the application to the selection and open the import page.
	function addDroppedFiles(files: File[]) {
		addSelectedFiles(files);

		const importPath = "/files/import";
		if (location.pathname !== importPath) void navigate(importPath);
	}

	const context: AppContext = {
		selectedFiles,
		addSelectedFiles,
		removeSelectedFile,
		clearSelectedFiles,
	};

	return (
		<FileDropTarget onDropFiles={addDroppedFiles}>
			<AppLayout
				sidebarWidth={loaderData.sidebarWidth}
				buildings={loaderData.buildings}
				batchGroups={loaderData.batchGroups}
			>
				<PageBreadcrumbs />
				<Outlet context={context} />
			</AppLayout>
		</FileDropTarget>
	);
}
