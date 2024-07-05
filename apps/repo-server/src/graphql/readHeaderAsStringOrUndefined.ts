export type HeaderType = string | string[] | undefined;

export function readHeaderAsStringOrUndefined(s: HeaderType) {
	if (Array.isArray(s)) {
		throw new Error("Couldn't read header as string");
	}

	return s;
}
