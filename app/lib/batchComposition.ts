export type BatchComposition = {
	activeMaterial: string | null;
	support: string | null;
};

export type BatchGroup<TBatch> = {
	name: string | null;
	supports: { name: string | null; batches: TBatch[] }[];
};

/**
 * Numbers inside a name sort by value. Al2O3 therefore comes before Al10O3.
 */
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * Groups batches by active material and then by support.
 *
 * Blank values are treated as missing. Missing groups sort after named groups.
 */
export function groupBatchesByComposition<TBatch extends { name: string } & BatchComposition>(
	batches: TBatch[],
): BatchGroup<TBatch>[] {
	const materials = new Map<string | null, Map<string | null, TBatch[]>>();

	for (const batch of batches) {
		const activeMaterial = normalize(batch.activeMaterial);
		const support = normalize(batch.support);
		const supports = materials.get(activeMaterial) ?? new Map<string | null, TBatch[]>();
		const groupedBatches = supports.get(support) ?? [];

		groupedBatches.push(batch);
		supports.set(support, groupedBatches);
		materials.set(activeMaterial, supports);
	}

	return [...materials]
		.sort(([left], [right]) => compareOptional(left, right))
		.map(([activeMaterial, supports]) => ({
			name: activeMaterial,
			supports: [...supports]
				.sort(([left], [right]) => compareOptional(left, right))
				.map(([support, groupedBatches]) => ({
					name: support,
					batches: [...groupedBatches].sort((left, right) =>
						collator.compare(left.name, right.name),
					),
				})),
		}));
}

/**
 * Returns the recorded composition as one line, for example "Pt/Al2O3".
 */
export function formatBatchComposition(composition: BatchComposition): string | undefined {
	const parts = [normalize(composition.activeMaterial), normalize(composition.support)].filter(
		(part): part is string => part !== null,
	);
	return parts.length > 0 ? parts.join("/") : undefined;
}

function normalize(value: string | null): string | null {
	const normalized = value?.trim();
	return normalized ? normalized : null;
}

function compareOptional(left: string | null, right: string | null): number {
	if (left === null) return right === null ? 0 : 1;
	if (right === null) return -1;
	return collator.compare(left, right);
}
