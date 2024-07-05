/**
 * Generates a new entity id and embeds the provided type id.
 *
 * @param hex - The hex type id. A two character hex string.
 * @returns The generated entity id
 */
export function entityId(hex: string | number): string;

/**
 * @deprecated - Use `entityId(hex: string): string` instead. Will be removed when migration to drizzle is complete.
 */
export function entityId<T extends string>(Entity: { typeid: T }): string;
export function entityId(arg: { typeid: string } | string | number): string {
	const hex =
		typeof arg === "number" ? arg : Number.parseInt(typeof arg === "string" ? arg : arg.typeid);

	if (hex < 0 || hex > 0xff || isNaN(hex)) {
		throw new Error("Type id must be a hex string or number in the range 0x00 to 0xff");
	}

	const bytes = new Uint8Array(16);
	// Fill the bytes array with random values, omitting the first 5 bytes
	crypto.getRandomValues(bytes.subarray(5));

	// Get the current time in ms since epoch
	let ms = Math.max(Date.now() - epoch, msLast);

	// There is a small chance that the time has not changed since the last call,
	// in which case we need to do extra work to ensure the ids are in ascending order.
	// For this case, there is an offset byte that is incremented.
	if (msLast === ms) {
		// If the offset has reached its maximum value, increment the ms value and reset the offset
		if (offset === 0xff) {
			offset = 0;
			++ms;
		}

		++offset;
	}
	// In case the time has changed since the last call, reset the offset to a random value
	else {
		offset = bytes[5];
	}

	msLast = ms;

	// Encode the timestamp in the first 5 bytes.
	// This gives us a maximum of 2^40 ms = 34.9 years.
	// Using the custom epoch, this will overflow in 2054.
	bytes[0] = ms / 2 ** 32;
	bytes[1] = ms / 2 ** 24;
	bytes[2] = ms / 2 ** 16;
	bytes[3] = ms / 2 ** 8;
	bytes[4] = ms;

	bytes[5] = offset;

	// Encode the version and variant bits
	bytes[6] = 0x40 | (bytes[6] >>> 4);
	bytes[7] = hex;
	bytes[8] = 0x80 | (bytes[8] >>> 4);

	// 00000000-0000-x000-y000-000000000000
	//               14   19

	let id = "";
	for (let i = 0; i < bytes.length; i++) {
		id += bytes[i].toString(16).padStart(2, "0");
		if (i === 3 || i === 5 || i === 7 || i === 9) id += "-";
	}

	return id;
}

let msLast = 0;
let offset = 0;

// Use a custom epoch so we have more time until the timestamp within the id overflows
const epoch = new Date("2020-01-01T00:00:00.000Z").getTime();
