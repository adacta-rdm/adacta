import { useSearchParams } from "react-router";

/**
 * State that only changes what a page shows lives in the query of the
 * address. For example, selecting the symbol F1 on a rig page turns
 * `/inventory/rigs/stand` into `/inventory/rigs/stand?symbol=F1`. A link can
 * then open the page with F1 selected.
 *
 * A change replaces the current history entry. The back button therefore
 * leaves the page instead of stepping through every selection. A change also
 * runs no loader again, because no loader reads such a parameter. A query
 * parameter that a loader reads, such as the filter `q`, changes through a
 * link or a form instead.
 */
export function useUrlState() {
	const [searchParams, setSearchParams] = useSearchParams();

	function updateUrlState(change: (next: URLSearchParams) => void) {
		const next = new URLSearchParams(searchParams);
		change(next);
		setSearchParams(next, {
			replace: true,
			preventScrollReset: true,
			defaultShouldRevalidate: false,
		});
	}

	return [searchParams, updateUrlState] as const;
}
