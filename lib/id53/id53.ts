/**
 * Generates integer IDs that fit in 53 bits. Within one sequence, each new ID
 * is larger than the previous one. Separate processes generate IDs without
 * coordinating with each other.
 *
 * An ID is a JavaScript number with two parts:
 *
 *   bits 52-11  milliseconds since the epoch (42 bits)
 *   bits 10-0   counter (11 bits)
 *
 * The value is `milliseconds * 2^11 + counter`. The largest ID is 2^53 - 1.
 * Every ID is therefore an exact JavaScript number. With 42 bits of
 * milliseconds and the default epoch of 2026-01-01, IDs can be generated until
 * 2165.
 *
 * The module holds one sequence for the whole process. The counter starts at a
 * random value and increases by 1 for each ID. It does not restart when the
 * millisecond changes. IDs from one sequence are therefore unique and strictly
 * increasing. The random start keeps IDs from following a visible pattern. It
 * also makes it unlikely that two processes generate the same IDs.
 *
 * Two processes that generate IDs at the same time produce the same ID only if
 * they use the same millisecond and their counters have the same value. For
 * example, if two processes each generate one ID in the same second, the
 * chance that both IDs are equal is about 1 in 2 million. IDs from different
 * processes sort in the order in which they were generated, except for IDs
 * generated in the same millisecond or within the difference between the
 * clocks of two machines. A unique index on the
 * ID column rejects such a duplicate. The caller can then retry with a new ID.
 *
 * The milliseconds in an ID show approximately when the ID was generated. They
 * can be later than the clock at the time of generation. This can happen after
 * a counter overflow or after the clock moves backward.
 */

const COUNTER_BITS = 11;
const COUNTER_VALUES = 2 ** COUNTER_BITS;
const MILLISECOND_VALUES = 2 ** 42;

const DEFAULT_EPOCH = Date.UTC(2026, 0, 1);

let epoch = DEFAULT_EPOCH;
let lastMillisecond = 0;
let counter = randomCounter();

export interface Id53Options {
	/**
	 * The date and time from which the milliseconds in an ID are counted. The
	 * default is 2026-01-01T00:00:00Z.
	 */
	epoch?: Date;
}

/**
 * Sets the epoch and resets the generator. If no epoch is supplied, the default
 * epoch is used.
 *
 * The reset discards the last millisecond used and the counter. The next ID
 * therefore starts a new sequence with a new random counter value. Call this
 * function before the first ID is generated. A later call has the following
 * consequences:
 *
 * - The next ID can be smaller than IDs generated before the call. For example,
 *   in the same millisecond, the new random counter value can be lower than
 *   the previous one.
 * - The new sequence can repeat an ID from the previous one. For example, both
 *   sequences can use the same millisecond and the same counter value.
 * - With a different epoch, the same moment gives a different number of
 *   milliseconds. New IDs can then be smaller than earlier IDs, and
 *   dateOfId53() returns incorrect times for IDs generated with the previous
 *   epoch.
 *
 * A database that already holds IDs must therefore keep the epoch with which
 * its IDs were generated.
 */
export function configureId53(options: Id53Options = {}): void {
	epoch = options.epoch?.getTime() ?? DEFAULT_EPOCH;
	lastMillisecond = 0;
	counter = randomCounter();
}

/**
 * Returns the next ID. Each ID is larger than the previous ID of the same
 * sequence.
 *
 * @throws RangeError when the clock is earlier than the epoch, or when the
 *   milliseconds since the epoch no longer fit in 42 bits.
 */
export function id53(): number {
	const clockMillisecond = Date.now() - epoch;

	if (clockMillisecond < 0) {
		throw new RangeError("The clock is earlier than the epoch.");
	}

	// If the clock moves backward, the generator keeps the last millisecond it
	// used. Otherwise, the next ID could be smaller than the previous one.
	let millisecond = Math.max(clockMillisecond, lastMillisecond);
	counter += 1;

	// When the counter overflows, it restarts at 0. The generator then uses at
	// least the millisecond after the last one it used. The ID is therefore
	// still larger than the previous one.
	if (counter === COUNTER_VALUES) {
		counter = 0;
		millisecond = Math.max(millisecond, lastMillisecond + 1);
	}

	if (millisecond >= MILLISECOND_VALUES) {
		throw new RangeError("The milliseconds since the epoch no longer fit in 42 bits.");
	}

	lastMillisecond = millisecond;

	// JavaScript bit operators work on 32-bit integers. Multiplication keeps
	// all 53 bits.
	return millisecond * COUNTER_VALUES + counter;
}

/**
 * Returns the time encoded in an ID, counted from the configured epoch. It can
 * differ from the time at which the ID was generated. For example, after a
 * counter overflow or after the clock moves backward, the encoded millisecond
 * can be later than the clock was at generation.
 */
export function dateOfId53(id: number): Date {
	return new Date(epoch + Math.floor(id / COUNTER_VALUES));
}

/**
 * Returns a random starting value for the counter. Math.random() is sufficient,
 * because the value only needs to differ between processes. It does not need
 * to be unpredictable.
 */
function randomCounter(): number {
	return Math.floor(Math.random() * COUNTER_VALUES);
}
