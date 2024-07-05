/**
 * Returns the position of the n-th occurrence of char in str
 */
export function indexOfNth(str: string, char: string, nth: number, fromIndex = 0): number {
	const indexChar = str.indexOf(char, fromIndex);
	if (indexChar === -1) {
		return -1;
	} else if (nth === 1) {
		return indexChar;
	} else {
		return indexOfNth(str, char, nth - 1, indexChar + 1);
	}
}
