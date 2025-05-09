import moment from "moment-timezone";

import type { TGamryMetadata } from "~/apps/repo-server/src/gamryDta/GamryFileReader";
import { assertDefined } from "~/lib/assert";

export function gamryCalculateTime(
	metadata: TGamryMetadata,
	min: number | undefined,
	max: number | undefined,
	timezone: string
) {
	const dateString = metadata["date"] as string;
	const timeString = metadata["time"] as string;

	assertDefined(min, "Min value is required");
	assertDefined(max, "Max value is required");
	assertDefined(dateString, "Date is required in metadata");
	assertDefined(timeString, "Time is required in metadata");

	const dateFormat = dateString.includes("/") ? "MM/DD/YYYY" : "DD/MM/YYYY";
	const timeFormat = "HH:mm:ss";

	const dateTimeString = `${dateString} ${timeString}`;

	const startDate = moment
		.tz(dateTimeString, `${dateFormat} ${timeFormat}`, timezone) // TODO: Replace
		.toDate();

	return {
		begin: new Date(startDate.getTime() + min * 1000),
		end: new Date(startDate.getTime() + max * 1000),
	};
}
