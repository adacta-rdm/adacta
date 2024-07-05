import type { Nullish } from "../../../interface/Nullish";

/**
 * Returns the most narrow timeframe for a given set of `begin` and `end` dates.
 *
 * The set of `begin` and `end` dates may contain nullish values. However, nullish values do not
 * narrow down the resulting time timeframe. Likewise, the nullish values in the returned timeframe
 * are to be interpreted as "without limit".
 */
export function narrowTimeframe(
	begin: [Nullish<Date>, Nullish<Date>],
	end: [Nullish<Date>, Nullish<Date>]
): [Date | undefined, Date | undefined] {
	let a, b;

	// Detect if given timeframes don't overlap
	if (
		(end[0] ?? Infinity) < (begin[1] ?? -Infinity) ||
		(end[1] ?? Infinity) < (begin[0] ?? -Infinity)
	) {
		throw new Error("narrowTimeframe() should only be called with two timeframes which overlap");
	}

	for (const date of begin) {
		if (date && (!a || date > a)) a = date;
	}

	for (const date of end) {
		if (date && (!b || date < b)) b = date;
	}

	return [a, b];
}
