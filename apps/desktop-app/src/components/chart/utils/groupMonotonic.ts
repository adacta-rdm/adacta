interface IPoint {
	x: number;
	y: number;
}

/**
 * This function takes an array of points (an object with `x` and `y` properties) and splits it into
 * multiple subarrays where the `x` property of point objects are either increasing or decreasing.
 *
 * Monotonicity of the subarray changes when the trend from increasing to decreasing or vice versa
 * is detected.
 *
 * @export
 * @param {IPoint[]} data - An array of points (`IPoint` array).
 * The `IPoint` is an object that has `x` and `y` properties, each being a number.
 *
 * @param includeOverlap A flag to determine whether to include the overlapping point
 * in both monotonic sections when the trend changes. Defaults to `false` if not provided.
 * Used in the UI to get a continuous line.
 *
 * @returns {IPoint[][]} - Returns an array of point arrays.
 * Each subarray is a monotonous sequence - it is either increasing or decreasing.
 *
 * @example
 *
 * Given `data` array as: `[{x: 1, y: 2}, {x: 2, y: 3}, {x: 3, y: 4}, {x: 2, y: 5}, {x: 1, y: 6}]`
 * The function will return:
 * `[[{x: 1, y: 2}, {x: 2, y: 3}, {x: 3, y: 4}], [{x: 2, y: 5}, {x: 1, y: 6}]]`
 * The first subarray is an increasing sequence, whereas the second subarray is a decreasing
 * sequence.
 */
export function groupMonotonic(data: IPoint[], includeOverlap?: boolean): IPoint[][] {
	let lastDirection: boolean | null = null;
	const transitionIndices: number[] = [];

	for (let i = 1; i < data.length; i++) {
		const currentValue = data[i].x;
		const previousValue = data[i - 1].x;
		const nextValue = data[i + 1]?.x;

		if (currentValue === previousValue) continue;

		// Detect the initial direction
		const currentDirection = currentValue > previousValue;
		if (lastDirection === null) {
			lastDirection = currentDirection;
			continue;
		}

		// Detect further in direction
		if (currentDirection !== lastDirection) {
			transitionIndices.push(i - 1);

			// Update direction by looking at the upcoming value
			lastDirection = nextValue > currentValue;
		}
	}

	let lastCutPoint = 0;
	const arrGroups = transitionIndices.map((index) => {
		const group = data.slice(lastCutPoint, index + 1);
		lastCutPoint = includeOverlap ? index : index + 1;
		return group;
	});

	arrGroups.push(data.slice(lastCutPoint));
	return arrGroups;
}
