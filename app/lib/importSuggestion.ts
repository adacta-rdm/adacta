import type { MeasurementSidecar } from "~/app/lib/measurementSidecar.ts";

export type ImportSuggestion = {
	id: number;
	slug: string;
	name: string;
	symbolKeys: string[];
};

/**
 * Count sidecar symbols that occur in the current diagram of the dropped rig.
 */
export function matchingSourceReferences(
	sidecar: MeasurementSidecar,
	suggestion: ImportSuggestion,
): { columns: { matched: number; total: number }; samples: { matched: number; total: number } } {
	const keys = new Set(suggestion.symbolKeys);
	const columns = sidecar.columns.filter((column) => "symbol_key" in column);
	const samples = sidecar.experiment.samples;
	return {
		columns: {
			matched: columns.filter((column) => keys.has(column.symbol_key)).length,
			total: columns.length,
		},
		samples: {
			matched: samples.filter((sample) => keys.has(sample.symbol_key)).length,
			total: samples.length,
		},
	};
}
