/**
 * Each kind of inventory record has its own URL and slug namespace.
 */
export function inventoryEntryPath(kind: "rig" | "equipment", slug: string): string {
	return `/inventory/${kind === "rig" ? "rigs" : "equipment"}/${encodeURIComponent(slug)}`;
}
