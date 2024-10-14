import { lastIndexOf } from "lodash-es";

/**
 * Returns the position of the n-th occurrence of char in str
 */
export function indexOfNthReverse(str: string, char: string, nth: number, fromIndex = 0): number {
	const indexChar = lastIndexOf(str.substring(0, str.length - fromIndex), char);

	if (indexChar === -1) {
		return -1;
	} else if (nth === 1) {
		return indexChar;
	} else {
		return indexOfNthReverse(str, char, nth - 1, str.length - indexChar);
	}
}
