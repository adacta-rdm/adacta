import type { ReactNode } from "react";

import { Tab, Tabs } from "~/app/components/Tabs.tsx";

/**
 * Groups a record list with its optional active and archived views.
 * The space below the tabs separates navigation from the column headers.
 */
export function ListPanel({
	label,
	busy = false,
	archive,
	children,
}: {
	label: string;
	busy?: boolean;
	archive?: {
		active: { to: string; count: number };
		archived: { to: string; count: number };
		showArchived: boolean;
	};
	children: ReactNode;
}) {
	return (
		<section
			aria-label={label}
			aria-busy={busy}
			className="overflow-hidden rounded-xl border border-border bg-surface"
		>
			{archive && (
				<div className="px-5 pt-4 pb-4">
					<Tabs label={`${label} views`}>
						<Tab
							to={archive.active.to}
							label="Active"
							count={archive.active.count}
							current={!archive.showArchived}
						/>
						<Tab
							to={archive.archived.to}
							label="Archived"
							count={archive.archived.count}
							current={archive.showArchived}
						/>
					</Tabs>
				</div>
			)}
			{children}
		</section>
	);
}

/**
 * Places shared search controls above one or more list panels.
 */
export function ListView({ filter, children }: { filter: ReactNode; children: ReactNode }) {
	return (
		<div className="space-y-6">
			{filter}
			{children}
		</div>
	);
}

/**
 * Gives empty lists the same inset as their table content.
 */
export function ListEmpty({ children }: { children: ReactNode }) {
	return <p className="px-5 py-5 text-sm text-foreground-muted">{children}</p>;
}
