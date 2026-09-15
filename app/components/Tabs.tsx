import type { ReactNode } from "react";
import { Link } from "react-router";

/**
 * A row of links that selects one view.
 *
 * Each tab has its own address. Therefore, a link opens the page on the
 * selected tab, and the browser history records the change.
 */
export function Tabs({ label, children }: { label: string; children: ReactNode }) {
	return (
		<nav aria-label={label} className="flex gap-6 border-b border-border">
			{children}
		</nav>
	);
}

/**
 * One link in a row of tabs.
 *
 * The current link uses aria-current, so the selected view does not depend on
 * the visible underline alone.
 */
export function Tab({
	to,
	label,
	count,
	current,
}: {
	to: string;
	label: string;
	count?: number | undefined;
	current: boolean;
}) {
	const shared = "-mb-px flex items-center gap-2 border-b-2 px-1 pb-2 text-sm font-medium";

	const style = current
		? "border-accent text-foreground"
		: "border-transparent text-foreground-muted hover:border-border-strong hover:text-foreground";

	return (
		<Link
			to={to}
			aria-current={current ? "page" : undefined}
			className={`${shared} ${style} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus`}
		>
			{label}

			{count === undefined ? null : (
				<span className="rounded-full bg-canvas-sunken px-2 py-0.5 text-xs text-foreground-muted">
					{count}
				</span>
			)}
		</Link>
	);
}
