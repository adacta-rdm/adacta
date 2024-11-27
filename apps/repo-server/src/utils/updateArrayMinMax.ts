type ElementType = number;
type ElementTypeOrUndefined = ElementType | undefined;
type A = ElementTypeOrUndefined[];

export function updateArrayMinMax(target: A, source: A, mode: "min" | "max"): A {
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
	target: A,
	source: A,
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
