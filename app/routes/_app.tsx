/**
 * Every application section shares the navigation shell.
 */

import { useCallback, useEffect, useState } from "react";
import { Outlet, useBlocker, useLocation, useMatches, useNavigate } from "react-router";

import { FileDropTarget } from "~/app/components/FileDropTarget.tsx";
import { PIDWorkspaceProvider } from "~/app/components/PIDWorkspaceContext.tsx";
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
	dropContext?: DropContext;
	setDropContext: (context: DropContext | undefined) => void;
	selectedFiles: File[];
	addSelectedFiles: (files: File[]) => void;
	removeSelectedFile: (file: File) => void;
	clearSelectedFiles: () => void;
};

export type DropContext =
	| { kind: "inventory-entry"; slug: string; label: string }
	| { kind: "sample-batch"; slug: string; label: string };

export default function App({ loaderData }: Route.ComponentProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const matches = useMatches();
	const pidMatch = matches.find((match) => match.id === "routes/inventory.$entrySlug.pid");
	const pidRigSlug = pidMatch?.params.entrySlug;
	const pidInitialToml = (pidMatch?.loaderData as { initialToml?: string } | undefined)
		?.initialToml;
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [dropContext, setDropContext] = useState<DropContext>();
	const [unsavedSidecar, setUnsavedSidecar] = useState(false);
	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			unsavedSidecar && currentLocation.pathname !== nextLocation.pathname,
	);

	useEffect(() => {
		if (blocker.state !== "blocked") return;
		if (window.confirm("These TOML changes have not been exported. Leave this page?"))
			blocker.proceed();
		else blocker.reset();
	}, [blocker]);

	useEffect(() => {
		if (!unsavedSidecar) return;
		const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", beforeUnload);
		return () => window.removeEventListener("beforeunload", beforeUnload);
	}, [unsavedSidecar]);

	function addSelectedFiles(files: File[]) {
		setSelectedFiles((current) => appendUniqueFiles(current, files));
	}

	function removeSelectedFile(file: File) {
		setSelectedFiles((current) => current.filter((candidate) => candidate !== file));
	}

	const clearSelectedFiles = useCallback(() => {
		setSelectedFiles((current) => (current.length === 0 ? current : []));
		setDropContext((current) => (current === undefined ? current : undefined));
	}, []);

	// Add files dropped in the application to the selection and open the import page.
	function addDroppedFiles(files: File[], target: EventTarget | null) {
		addSelectedFiles(files);
		const targetContext = readDropTargetContext(target);
		const entryMatch = matches.find((match) => match.id === "routes/inventory.$entrySlug");
		const entry = (
			entryMatch?.loaderData as { entry?: { slug: string; name: string; kind: string } } | undefined
		)?.entry;
		const batchMatch = matches.find((match) => match.id === "routes/samples.$batchSlug");
		const batch = batchMatch?.loaderData as { name?: string } | undefined;
		const batchSlug = batchMatch?.params.batchSlug;
		const context: DropContext | undefined =
			targetContext ??
			(entry?.kind === "rig"
				? { kind: "inventory-entry", slug: entry.slug, label: entry.name }
				: batch && typeof batchSlug === "string"
					? { kind: "sample-batch", slug: batchSlug, label: batch.name ?? batchSlug }
					: undefined);
		if (context) setDropContext(context);

		const importPath = "/files/import";
		if (location.pathname !== importPath) {
			const search = context
				? `?contextKind=${encodeURIComponent(context.kind)}&contextSlug=${encodeURIComponent(context.slug)}&contextLabel=${encodeURIComponent(context.label)}`
				: "";
			void navigate(`${importPath}${search}`);
		}
	}

	const context: AppContext = {
		dropContext,
		setDropContext,
		selectedFiles,
		addSelectedFiles,
		removeSelectedFile,
		clearSelectedFiles,
	};

	return (
		<PIDWorkspaceProvider
			trigSlug={pidRigSlug}
			initialToml={pidInitialToml}
			onUnsavedChange={setUnsavedSidecar}
		>
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
		</PIDWorkspaceProvider>
	);
}

function readDropTargetContext(target: EventTarget | null): DropContext | undefined {
	if (!(target instanceof Element)) return undefined;
	const dropTarget = target.closest<HTMLElement>("[data-drop-context-kind]");
	const kind = dropTarget?.dataset.dropContextKind;
	const slug = dropTarget?.dataset.dropContextSlug;
	const label = dropTarget?.dataset.dropContextLabel;
	if (!slug || !label) return undefined;
	if (kind === "inventory-entry" || kind === "sample-batch") return { kind, slug, label };
	return undefined;
}
