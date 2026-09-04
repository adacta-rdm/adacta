/**
 * Numbers inside a label sort by value. "#9" therefore comes before "#10".
 */
const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

const NUMBERED_LABEL = /^#(\d+)$/;

/**
 * Orders numbered sample labels before other labels and compares their numeric
 * values. For example, #02 sorts before #10.
 */
export function compareSampleNames(left: string, right: string): number {
	const leftNumber = labelNumber(left);
	const rightNumber = labelNumber(right);

	if (leftNumber !== undefined && rightNumber !== undefined) return leftNumber - rightNumber;
	if (leftNumber !== undefined) return -1;
	if (rightNumber !== undefined) return 1;
	return collator.compare(left, right);
}

/**
 * Suggests the label after the highest numbered label in a batch.
 *
 * Labels outside the #01 convention are ignored. Existing numbers are not
 * reused. An older physical sample may still carry that label.
 */
export function nextSampleName(existingNames: string[]): string {
	const numbers = existingNames
		.map(labelNumber)
		.filter((value): value is number => value !== undefined);

	return formatNumber(Math.max(0, ...numbers) + 1);
}

function labelNumber(name: string): number | undefined {
	const digits = NUMBERED_LABEL.exec(name.trim())?.[1];
	return digits === undefined ? undefined : Number.parseInt(digits, 10);
}

function formatNumber(value: number): string {
	return `#${String(value).padStart(2, "0")}`;
}
