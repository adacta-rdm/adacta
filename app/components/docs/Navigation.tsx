import clsx from "clsx";
import { Link, useLocation } from "react-router";

import { navigation } from "~/app/docs/navigation";

/**
 * The docs sidebar: renders the section/link tree from navigation.ts and marks
 * the link matching the current path as active. Ported from the template's
 * Navigation; next/link -> react-router Link and usePathname -> useLocation.
 */
export function Navigation({
	className,
	onLinkClick,
}: {
	className?: string;
	onLinkClick?: React.MouseEventHandler<HTMLAnchorElement>;
}) {
	const pathname = useLocation().pathname;

	return (
		<nav className={clsx("text-base lg:text-sm", className)}>
			<ul role="list" className="space-y-9">
				{navigation.map((section) => (
					<li key={section.title}>
						<h2 className="font-display font-medium text-slate-900 dark:text-white">
							{section.title}
						</h2>
						<ul
							role="list"
							className="mt-2 space-y-2 border-l-2 border-slate-100 lg:mt-4 lg:space-y-4 lg:border-slate-200 dark:border-slate-800"
						>
							{section.links.map((link) => (
								<li key={link.href} className="relative">
									<Link
										to={link.href}
										onClick={onLinkClick}
										className={clsx(
											"block w-full pl-3.5 before:pointer-events-none before:absolute before:top-1/2 before:-left-1 before:h-1.5 before:w-1.5 before:-translate-y-1/2 before:rounded-full",
											link.href === pathname
												? "font-semibold text-sky-500 before:bg-sky-500"
												: "text-slate-500 before:hidden before:bg-slate-300 hover:text-slate-600 hover:before:block dark:text-slate-400 dark:before:bg-slate-700 dark:hover:text-slate-300",
										)}
									>
										{link.title}
									</Link>
								</li>
							))}
						</ul>
					</li>
				))}
			</ul>
		</nav>
	);
}
