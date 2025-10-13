import assert from "assert";

import moment from "moment-timezone";

import type { IColumnTimeConfig } from "../interface/IImportWizardPreset";

import { assertUnreachable } from "~/lib/assert/assertUnreachable";

export function parseTimeInformation(
	value: string,
	config: IColumnTimeConfig,
	decimalSeparator: string
): number {
	let unixTime = undefined;

	switch (config.type) {
		case "datetime":
		case "date":
			unixTime = moment.tz(value, `${config.format}`, config.timezone).toDate().getTime();
			break;
		case "time":
			unixTime =
				moment
					.tz(value, `${config.format}`, config.timezone)
					.date(1)
					.month(0)
					.year(1970)
					.toDate()
					.getTime() + (config.startDate ?? 0);

			break;

		case "offset": {
			const offsetString = value.replace(decimalSeparator, ".");

			// Empty strings will be converted to 0 by Number(), but that is not desired here.
			// Interpreting an empty offset as 0 would lead to wrong timestamps which in turn would
			// produce a (in this case confusing) error about non-descending/ascending x-values.
			// By throwing here the user gets a warning that the time column could not be parsed for
			// this row
			if (offsetString.trim() === "") {
				throw new Error("Offset column is empty");
			}
			const offset = Number(offsetString);

			assert(!isNaN(offset), "Error while parsing offset column as number");

			unixTime = config.startDate + offset * config.conversionFactor;
			break;
		}
		default: {
			assertUnreachable(config);
		}
	}

	assert(
		unixTime !== undefined && !isNaN(unixTime),
		`Could not convert date and time (${value}) to a valid unix timestamp.`
	);

	return unixTime;
}
