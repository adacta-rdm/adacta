export function skipIndices(index: number, skippedIndices: number[]) {
	const offset = skippedIndices.filter((skip) => skip < index);
	return index - offset.length;
}
