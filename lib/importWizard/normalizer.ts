type NormalizerFn<T> = (input: T) => T;

const NormalizerIdStringList = ["cutOffAfterFirstSpace"] as const;
const NormalizerIdNumberList = ["turnNaNIntoZero"] as const;
export type NormalizerIdString = (typeof NormalizerIdStringList)[number];
export type NormalizerIdNumber = (typeof NormalizerIdNumberList)[number];
export type NormalizerId = NormalizerIdString | NormalizerIdNumber;

interface INormalizer<T> {
	name: string;
	fn: NormalizerFn<T>;
}

export function isNumberNormalizer(id: string | undefined): id is NormalizerIdNumber {
	return NormalizerIdNumberList.includes(id as any);
}

export function isStringNormalizer(id: string | undefined): id is NormalizerIdString {
	return NormalizerIdStringList.includes(id as any);
}

const stringNormalizer = new Map<NormalizerIdString, INormalizer<string>>();
const numberNormalizer = new Map<NormalizerIdNumber, INormalizer<number>>();

registerNormalizer(
	"string",
	"cutOffAfterFirstSpace",
	"Cut of after first space",
	(input) => input.split(" ")[0]
);
registerNormalizer("number", "turnNaNIntoZero", "Turn NaN into 0", (input) => {
	if (isNaN(input)) {
		return 0;
	}

	return input;
});

export function applyStringNormalizer(id: NormalizerIdString, input: string) {
	const normalizer = stringNormalizer.get(id);
	if (normalizer === undefined) {
		throw new Error(`Unsupported normalizer: ${id} is not a known normalizer`);
	}
	return normalizer.fn(input);
}

export function applyNumberNormalizer(id: NormalizerIdNumber, input: number) {
	const normalizer = numberNormalizer.get(id);
	if (normalizer === undefined) {
		throw new Error(`Unsupported normalizer: ${id} is not a known normalizer`);
	}
	return normalizer.fn(input);
}

function registerNormalizer<T extends "string" | "number">(
	type: T,
	id: T extends "string" ? NormalizerIdString : NormalizerIdNumber,
	name: string,
	fn: NormalizerFn<T extends "string" ? string : number>
) {
	if (type === "string") {
		stringNormalizer.set(id as NormalizerIdString, {
			name,
			fn: fn as unknown as NormalizerFn<string>,
		});
	} else if (type === "number") {
		numberNormalizer.set(id as NormalizerIdNumber, {
			name,
			fn: fn as unknown as NormalizerFn<number>,
		});
	}
}

export function getNormalizerList(): (
	| { type: "string"; id: NormalizerIdString; name: string }
	| { type: "number"; id: NormalizerIdNumber; name: string }
)[] {
	return [
		...[...stringNormalizer.entries()].map(([id, { name }]) => ({
			type: "string" as const,
			id,
			name,
		})),

		...[...numberNormalizer.entries()].map(([id, { name }]) => ({
			type: "number" as const,
			id,
			name,
		})),
	];
}
