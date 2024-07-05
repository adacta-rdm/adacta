import { InvalidArgumentError } from "~/lib/errors/InvalidArgumentError";

export function toBase(int: number, alphabet: string) {
	if (!Number.isSafeInteger(int) || int < 0) {
		throw new InvalidArgumentError("Argument must be a positive integer");
	}

	if (new Set(alphabet).size !== alphabet.length) {
		throw new InvalidArgumentError("Alphabet contains duplicates");
	}

	if (alphabet.length === 0) {
		throw new InvalidArgumentError("Alphabet must not be empty");
	}

	let str = "";
	const base = alphabet.length;

	// do-while loop to handle the case where int is 0.
	// Otherwise, an empty string would be returned.
	do {
		str = alphabet[int % base] + str;
		int = Math.floor(int / base);
	} while (int > 0);

	return str;
}
