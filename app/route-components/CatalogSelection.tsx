import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

/**
 * Keep selected products in the URL so search and browser navigation preserve them.
 */
export function useCatalogSelection() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [selected, setSelected] = useState(() => new Set(searchParams.getAll("selected")));

	// The checkbox changes immediately while the URL loads. Browser navigation
	// then restores the selection recorded in that URL.
	useEffect(() => {
		setSelected(new Set(searchParams.getAll("selected")));
	}, [searchParams]);

	const selectionSearch = new URLSearchParams();
	for (const id of selected) selectionSearch.append("selected", id);

	function selectProduct(id: number, checked: boolean) {
		const next = new URLSearchParams(searchParams);
		const values = new Set(selected);
		if (checked) values.add(String(id));
		else values.delete(String(id));
		next.delete("selected");
		for (const value of values) next.append("selected", value);
		setSelected(values);
		setSearchParams(next);
	}

	return { selected, selectionSearch, selectProduct };
}

export function CatalogSelection() {
	const { selected, selectionSearch } = useCatalogSelection();
	if (selected.size === 0) return null;

	return (
		<Link
			to={`/catalog/import?${selectionSearch}`}
			className="text-sm font-medium text-link hover:text-link-hover"
		>
			Import {selected.size} selected
		</Link>
	);
}
