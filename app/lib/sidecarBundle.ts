/**
 * An upload forms a sidecar bundle when it contains exactly one CSV file and
 * one TOML file. For example, `data.CSV` and `data.toml` form a bundle.
 * All other combinations return undefined.
 */
export function sidecarBundle<T extends { originalName: string }>(files: readonly T[]) {
	if (files.length !== 2) return undefined;

	const csv = files.find((file) => file.originalName.toLowerCase().endsWith(".csv"));
	const toml = files.find((file) => file.originalName.toLowerCase().endsWith(".toml"));
	return csv && toml ? { csv, toml } : undefined;
}
