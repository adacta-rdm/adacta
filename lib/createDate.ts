import type { Opaque } from "type-fest";

const ISO_REGEX =
	/(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/;

export type IDatetime = Opaque<string, Date>;

export function assertIsoDate(isoString: string): asserts isoString is IDatetime {
	if (!ISO_REGEX.test(isoString)) {
		throw new Error(`'${isoString}' is not an ISO Date string`);
	}
}

export function createMaybeDate(maybeIsoString: string | null | undefined) {
	if (maybeIsoString === null || maybeIsoString === undefined) {
		return undefined;
	}
	return createDate(maybeIsoString);
}

export function createDate(isoString: string) {
	assertIsoDate(isoString);
	return new Date(isoString);
}

export function createMaybeIDatetime(
	date: Date | IDatetime | null | undefined
): IDatetime | undefined {
	if (date === null || date === undefined) {
		return undefined;
	}
	return createIDatetime(date);
}

export function createIDatetime(date: Date | IDatetime): IDatetime {
	if (date instanceof Date) return date.toISOString() as IDatetime;
	return date;
}
