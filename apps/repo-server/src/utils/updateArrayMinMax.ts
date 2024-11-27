// Helper types to make it easier to update the code to work with non number arrays
type ElementType = number;
type ElementTypeOrUndefined = ElementType | undefined;
type Array = ElementTypeOrUndefined[];

export function updateArrayMinMax(target: Array, source: Array, mode: "min" | "max"): Array {
	return updateArray(target, source, (target, source) => {
		if (mode === "min") {
			return source > target;
		} else {
			return source < target;
		}
	});
}

/**
 * Update the target array with the source array based on the pickTarget function
 * Undefined values in the target array will be overwritten by the source array
 */
function updateArray(
	target: Array,
	source: Array,
	pickTarget: (target: ElementType, source: ElementType) => boolean
) {
	for (let i = 0; i < target.length; i++) {
		const tValue = target[i];
		const sValue = source[i];

		// If the target value is undefined, but the source value is not, we can just copy the source value
		if (tValue == undefined && sValue != undefined) {
			target[i] = source[i];
			continue;
		}

		if (tValue !== undefined && sValue !== undefined) {
			target[i] = pickTarget(tValue, sValue) ? target[i] : source[i];
		}
	}

	return target;
}
