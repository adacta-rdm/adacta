import { useLocation } from "react-router";

import { navigation } from "~/app/docs/navigation";

/**
 * The heading block at the top of a doc: the containing section's name (looked
 * up from the nav by current path) above the page title. Renders nothing when
 * neither is known. Ported from the template; usePathname -> useLocation.
 */
export function DocsHeader({ title }: { title?: string }) {
	const pathname = useLocation().pathname;
	const section = navigation.find((section) =>
		section.links.find((link) => link.href === pathname),
	);

	if (!title && !section) {
		return null;
	}

	return (
		<header className="mb-9 space-y-1">
			{section && <p className="font-display text-sm font-medium text-sky-500">{section.title}</p>}
			{title && (
				<h1 className="font-display text-3xl tracking-tight text-slate-900 dark:text-white">
					{title}
				</h1>
			)}
		</header>
	);
}
