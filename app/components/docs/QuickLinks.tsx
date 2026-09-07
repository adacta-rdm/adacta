import { Link } from "react-router";

import { Icon } from "~/app/components/docs/Icon.tsx";

/**
 * Grid container for a set of QuickLink cards. Rendered from the Markdoc
 * `quick-links` tag; used on landing pages to surface key sections.
 */
export function QuickLinks({ children }: { children: React.ReactNode }) {
	return <div className="not-prose my-12 grid grid-cols-1 gap-6 sm:grid-cols-2">{children}</div>;
}

/**
 * A single QuickLink card: icon, linked title, and description. Rendered from
 * the Markdoc `quick-link` tag. Uses react-router's Link (the template used
 * next/link) so client-side navigation stays within the SPA.
 */
export function QuickLink({
	title,
	description,
	href,
	icon,
}: {
	title: string;
	description: string;
	href: string;
	icon: React.ComponentProps<typeof Icon>["icon"];
}) {
	return (
		<div className="group relative rounded-xl border border-slate-200 dark:border-slate-800">
			<div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,var(--color-sky-50)),var(--quick-links-hover-bg,var(--color-sky-50)))_padding-box,linear-gradient(to_top,var(--color-indigo-400),var(--color-cyan-400),var(--color-sky-500))_border-box] group-hover:opacity-100 dark:[--quick-links-hover-bg:var(--color-slate-800)]" />
			<div className="relative overflow-hidden rounded-xl p-6">
				<Icon icon={icon} className="h-8 w-8" />
				<h2 className="mt-4 font-display text-base text-slate-900 dark:text-white">
					<Link to={href}>
						<span className="absolute -inset-px rounded-xl" />
						{title}
					</Link>
				</h2>
				<p className="mt-1 text-sm text-slate-700 dark:text-slate-400">{description}</p>
			</div>
		</div>
	);
}
