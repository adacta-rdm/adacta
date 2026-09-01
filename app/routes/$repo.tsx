/**
 * Repository scope.
 *
 * The sidebar is shared by every section. The inventory tree is therefore loaded here
 * rather than inside the inventory section.
 */

import { isNull } from "drizzle-orm";
import { useRef, useState, type DragEvent } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

import { services } from "~/app/.server/context";
import { appendUniqueFiles } from "~/app/import/sourceFiles";
import { AppLayout } from "~/app/layout/AppLayout";
import { sessionAuth } from "~/app/middleware/authentication";
import { repositoryAccess } from "~/app/middleware/repositoryAccess";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { groupByLocation } from "~/app/utils/location";
import { InventoryEntry as InventoryEntryTable } from "~/drizzle/schema/repo.InventoryEntry";

import type { Route } from "./+types/$repo";

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

export type RepositoryContext = {
	sourceBundle: File[];
	addSourceFiles: (files: File[]) => void;
	removeSourceFile: (file: File) => void;
	clearSourceFiles: () => void;
};

export default function Repository({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const dragDepth = useRef(0);
	const [isDraggingFiles, setIsDraggingFiles] = useState(false);
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

	function containsFiles(event: DragEvent<HTMLElement>) {
		return event.dataTransfer.types.includes("Files");
	}

	function handleDragEnter(event: DragEvent<HTMLElement>) {
		if (!containsFiles(event)) return;
		event.preventDefault();
		dragDepth.current += 1;
		setIsDraggingFiles(true);
	}

	function handleDragOver(event: DragEvent<HTMLElement>) {
		if (!containsFiles(event)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = "copy";
	}

	function handleDragLeave(event: DragEvent<HTMLElement>) {
		if (!containsFiles(event)) return;
		dragDepth.current = Math.max(0, dragDepth.current - 1);
		if (dragDepth.current === 0) setIsDraggingFiles(false);
	}

	function handleDrop(event: DragEvent<HTMLElement>) {
		if (!containsFiles(event)) return;
		event.preventDefault();
		dragDepth.current = 0;
		setIsDraggingFiles(false);

		const files = [...event.dataTransfer.files];
		if (files.length === 0) return;
		addSourceFiles(files);

		const importPath = `/${loaderData.repository}/import`;
		if (location.pathname !== importPath) void navigate(importPath);
	}

	const context: RepositoryContext = {
		sourceBundle,
		addSourceFiles,
		removeSourceFile,
		clearSourceFiles,
	};

	return (
		<div
			className={isDraggingFiles ? "cursor-copy" : undefined}
			onDragEnter={handleDragEnter}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			<AppLayout repository={loaderData.repository} buildings={loaderData.buildings}>
				<Outlet context={context} />
			</AppLayout>

			{isDraggingFiles ? (
				<div
					role="status"
					className="pointer-events-none fixed inset-4 z-50 grid place-items-center rounded-xl border-2 border-dashed border-accent bg-canvas/90 text-foreground shadow-lg backdrop-blur-sm"
				>
					<p className="text-lg font-semibold">Drop files to import</p>
				</div>
			) : null}
		</div>
	);
}
