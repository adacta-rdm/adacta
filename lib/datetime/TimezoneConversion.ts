import moment from "moment-timezone";

/**
 * Takes a Date object (based on local timezone) and interprets it as if it was from a different timezone.
 * This means that any timezone information stored within the Date object is replaced by `timezone`.
 */
export function localDateToTimezoneDate(date: Date, timezone: string) {
	return moment(date).tz(timezone, true).toDate();
}

export function timezoneDateToLocalDate(date: Date, timezone: string) {
	return moment(date).tz(timezone).tz(moment.tz.guess(), true).toDate();
}
