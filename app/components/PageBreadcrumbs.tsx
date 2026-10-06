import { ChevronRightIcon } from "@heroicons/react/20/solid";
import { Link, useLocation, useMatches } from "react-router";

/**
 * A route adds one entry to the trail, which links to the route's own path.
 * The label is a fixed text or is read from the route's loader data. For
 * example, a batch page reads the batch name. A label function receives no
 * loader data when the loader failed. It then returns nothing, and the trail
 * omits the entry.
 */
export type BreadcrumbHandle<LoaderData = unknown> = {
	breadcrumb: string | ((loaderData: LoaderData | undefined) => string | undefined);
};

/**
 * React Router exposes handles as unknown. A handle without a breadcrumb adds
 * no entry.
 */
function hasBreadcrumb(handle: unknown): handle is BreadcrumbHandle {
	if (typeof handle !== "object" || handle === null || !("breadcrumb" in handle)) return false;

	return typeof handle.breadcrumb === "string" || typeof handle.breadcrumb === "function";
}

/**
 * Removes a trailing slash from a path. For example, "/inventory/" becomes
 * "/inventory". React Router reports the path of an index route with the
 * slash. The root path "/" stays as it is.
 */
function withoutTrailingSlash(path: string): string {
	return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export function PageBreadcrumbs() {
	const matches = useMatches();
	const pathname = withoutTrailingSlash(useLocation().pathname);

	const entries = matches.flatMap((match) => {
		if (!hasBreadcrumb(match.handle)) return [];

		const { breadcrumb } = match.handle;
		const label = typeof breadcrumb === "string" ? breadcrumb : breadcrumb(match.loaderData);
		if (!label) return [];

		return [{ label, path: withoutTrailingSlash(match.pathname), key: match.id }];
	});

	if (entries.length === 0) return null;

	return (
		<nav aria-label="Breadcrumb" className="mb-6 text-sm/5 text-foreground-muted">
			{/* Divide the width so a long ancestor name cannot hide the current page. */}
			<ol className="flex min-w-0 items-center gap-1.5">
				{entries.map((entry, index) => (
					<li
						key={entry.key}
						className="flex min-w-0 flex-1 items-center gap-1.5 first:flex-initial sm:flex-initial"
					>
						{index > 0 && <ChevronRightIcon aria-hidden="true" className="size-4 shrink-0" />}
						{entry.path === pathname ? (
							<span aria-current="page" title={entry.label} className="truncate">
								{entry.label}
							</span>
						) : (
							<Link
								to={entry.path}
								title={entry.label}
								className="truncate rounded-sm hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
							>
								{entry.label}
							</Link>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
