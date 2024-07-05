import type { InputMaybe, ITimeFrameInput } from "../../generated/resolvers";

import { createDate } from "~/lib/createDate";

/**
 * Shared utility function for resolvers which support two different types as arguments for time
 * (time frame and a single time).
 *
 * - If time and timeFrame are both undefined assume the current values are requested
 * - If time is supplied assume that the values for that time are requested
 * - If timeFrame is supplied assume that the values within that timeframe are requested (if begin
 *   is undefined the timeframe includes the begin of time, if end is undefined the timeframe
 *   includes until now)
 */
export function timeFrameArgumentInterpretation(
	time: InputMaybe<string>,
	timeFrame: InputMaybe<ITimeFrameInput>
): [Date | undefined, Date | undefined] {
	let begin: Date | undefined;
	let end: Date | undefined;
	if (time == undefined && timeFrame == undefined) {
		// If nothing is defined the caller is interested in the current values
		// Since `begin` is always inclusive while `end` is always exclusive there has to be a
		// small difference between them.
		begin = new Date();
		end = new Date(begin.getTime() + 1);
	} else if (time) {
		// If time is defined the caller is interested in the values at a specific point in
		// time. Since `begin` is always inclusive while `end` is always exclusive there has to be a
		// small difference between them.
		begin = createDate(time);
		end = new Date(createDate(time).getTime() + 1);
	} else if (timeFrame) {
		if (timeFrame.begin === timeFrame.end && timeFrame.begin !== null) {
			throw new Error(
				"This will always return nothing. Consider using the `time` parameter instead"
			);
		}
		begin = timeFrame.begin ? createDate(timeFrame.begin) : new Date(0);
		end = timeFrame.end ? createDate(timeFrame.end) : undefined;
	}

	return [begin, end];
}
