import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";

/**
 * Checks whether the timeframe of the given `property` overlaps with the timeframe specified with `begin` and
 * `end`.
 *
 * @param property
 * @param begin
 * @param end
 */
export function hasOverlapWithTimeframe(
	property: DrizzleEntity<"Property">,
	begin: Date | undefined,
	end: Date | undefined
) {
	// nullish begin date means no limit (begin = -infinity)
	const beginTimestamp = begin ? begin.getTime() : -Infinity;
	const beginProp = new Date(property.begin).getTime();
	// nullish end date means no limit (end = infinity)
	const endTimestamp = end ? end.getTime() : Infinity;
	const endProp = property.end ? new Date(property.end).getTime() : Infinity;

	return beginTimestamp < endProp && beginProp < endTimestamp;
}
