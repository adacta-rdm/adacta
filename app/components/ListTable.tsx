import type { ReactNode } from "react";

/**
 * Keeps horizontal scrolling and column spacing consistent within a list panel.
 */
export function ListTable({ children, label }: { children: ReactNode; label: string }) {
	return (
		<div className="overflow-x-auto">
			<table aria-label={label} className="w-full text-left text-sm">
				{children}
			</table>
		</div>
	);
}

/**
 * Separates column labels from records with a shaded background.
 */
export function ListTableHead({ children }: { children: ReactNode }) {
	return (
		<thead className="border-b border-border bg-surface-muted text-foreground-muted [&_th]:py-2 [&_th]:pr-4 [&_th]:font-medium [&_th:first-child]:pl-5 [&_th:last-child]:pr-5">
			{children}
		</thead>
	);
}
