/**
 * Function to ensure all header names in an array are unique.
 * @param headers {readonly string[]} - An array of header names.
 * @returns {string[]} - Returns a new array of unique header names. If any header name is repeated,
 * a numeric suffix is added to all distinguish it from previous occurrences.
 *
 * @example
 * Given `headers` array as: `["a", "b", "a", "c", "b"]`
 * The function will return:
 * `["a (1)", "b (1)", "a (2)", "c", "b (2)"]`
 */
export function makeHeadersUnique(headers: readonly string[]): string[] {
	// Initialize a new map to keep track of which headers have been seen and their corresponding indices.
	const headerToIndexMap = new Map<string, number[]>();

	const newHeaders: string[] = [...headers];

	// Loop through headers to fill the map with header names and corresponding indices.
	for (let i = 0; i < headers.length; i++) {
		const header = headers[i];
		const a = headerToIndexMap.get(header) ?? [];
		headerToIndexMap.set(header, [...a, i]);
	}

	// Modify the newHeaders array to add the suffix to any repeated header names
	for (const [columnName, appearances] of headerToIndexMap) {
		if (columnName.trim() === "") {
			// Don't modify empty headers. Otherwise (repeated) empty headers would be renamed to
			// " (1)", " (2)", etc.
			continue;
		}
		if (appearances.length > 1) {
			for (let i = 0; i < appearances.length; i++) {
				const appearance = appearances[i];
				newHeaders[appearance] = `${columnName} (${i + 1})`;
			}
		}
	}

	// Remove the last header if it is an empty string. This is usually an indicator of a accidental
	// trailing delimiter in the CSV file (which introduces an empty column).
	if (newHeaders[headers.length - 1] === "") {
		return newHeaders.slice(0, -1);
	}

	return newHeaders;
}
