/**
 * Sorts an array of objects based on a provided stringify function.
 *
 * @param {T[]} elements - The array of elements to be sorted. This should be an array of any type.
 * @param {(a: T) => string} stringify - The function to be called to convert each element to a string for sorting.
 * @returns {T[]} The sorted array of elements. The elements are sorted in ascending order based on their string representations.
 */
export function sortObjects<T>(elements: readonly T[], stringify: (a: T) => string): T[] {
	// Convert each element to a string using the provided stringify function
	const stringElements = elements.map((e) => stringify(e));

	// Create a map where the keys are the string representations of the elements and the values are the elements
	// themselves. This map is used to retrieve the original elements after sorting their string representations.
	const map: Map<string, T> = new Map(elements.map((e, i) => [stringElements[i], e]));

	// Sort the string representations of the elements in ascending order
	stringElements.sort();

	// Map the sorted string representations back to their original elements
	// The 'as T' type assertion is used because map.get() can return undefined,
	// but we know that every string representation has a corresponding element.
	return stringElements.map((e) => map.get(e) as T);
}
