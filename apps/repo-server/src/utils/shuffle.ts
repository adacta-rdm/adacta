/**
 * Returns a random permutation of the input string or array.
 *
 * Implementation of the Fisher-Yates shuffle algorithm.
 * https://en.wikipedia.org/wiki/Fisher–Yates_shuffle#The_modern_algorithm
 * https://stackoverflow.com/a/12646864
 *
 * @param arg
 */
export function shuffle<T extends string | unknown[]>(arg: T): T {
	// Create a copy of the input arg. In case of a string, the copy is an array of characters.
	const array = [...arg];

	for (let i = arg.length - 1; i > 0; --i) {
		const j = Math.floor(Math.random() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}

	return (Array.isArray(arg) ? array : array.join("")) as T;
}
