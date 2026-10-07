/**
 * Every application section shares the navigation shell.
 */

import { useState } from "react";
import { Outlet, useLocation, useMatches, useNavigate } from "react-router";

import { FileDropTarget } from "~/app/components/FileDropTarget.tsx";
import { PageBreadcrumbs } from "~/app/components/PageBreadcrumbs.tsx";
import { AppLayout } from "~/app/layout/AppLayout.tsx";
import { leftSidebarFromMatches, rightSidebarFromMatches } from "~/app/layout/routeSidebar.ts";
import { appendUniqueFiles } from "~/app/lib/appendUniqueFiles.ts";
import { sidebarCollapsedFromCookie, sidebarWidthFromCookie } from "~/app/lib/sidebarWidth.ts";
import { sessionAuth } from "~/app/middleware/authentication.ts";

import type { Route } from "./+types/_app.ts";

/**
 * Authenticate before any application loader runs.
 */
export const middleware: Route.MiddlewareFunction[] = [sessionAuth];

export function loader({ request }: Route.LoaderArgs) {
	return {
		sidebarCollapsed: sidebarCollapsedFromCookie(request.headers.get("cookie")),
		sidebarWidth: sidebarWidthFromCookie(request.headers.get("cookie")),
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
	const matches = useMatches();
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
				sidebarCollapsed={loaderData.sidebarCollapsed}
				sidebarWidth={loaderData.sidebarWidth}
				leftSidebar={leftSidebarFromMatches(matches)}
				rightSidebar={rightSidebarFromMatches(matches)}
			>
				<PageBreadcrumbs />
				<Outlet context={context} />
			</AppLayout>
		</FileDropTarget>
	);
}
