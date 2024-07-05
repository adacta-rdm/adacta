import assert from "assert";

import { assertUnreachable } from "@omegadot/assert";
import moment from "moment-timezone";

import type { IColumnTimeConfig } from "../interface/IImportWizardPreset";

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
			const offset = Number(value.replace(decimalSeparator, "."));

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
