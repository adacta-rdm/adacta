const LETTER_A_CHARCODE = 65;
const LETTER_COUNT = 26;

export function indexToLetter(index: number): string {
	if (Number.isNaN(index)) {
		throw new Error("Invalid index");
	}
	if (index < 0) {
		throw new Error("Invalid argument: Negative index");
	}

	if (0 <= index && index <= LETTER_COUNT - 1) {
		return String.fromCharCode(LETTER_A_CHARCODE + index);
	}

	const a = Math.floor(index / LETTER_COUNT) - 1;
	const b = index % LETTER_COUNT;

	return indexToLetter(a) + indexToLetter(b);
}
