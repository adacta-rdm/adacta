/**
 * Normalizer that can be applied to strings
 */
const stringNormalizer = new Map<StringNormalizerId, INormalizer<string>>();

/**
 * Normalizers that can be applied to already parsed numbers
 */
const numberNormalizer = new Map<NumberNormalizerId, INormalizer<number>>();

/**
 * Normalizer that cuts off a string after the first space
 */
registerNormalizer({
	type: "string",
	id: "cutOffAfterFirstSpace",
	name: "Cut of after first space",
	fn: (input) => input.split(" ")[0],
});

/**
 * Normalizer that turns NaN into 0
 */
registerNormalizer({
	type: "number",
	id: "turnNaNIntoZero",
	name: "Turn NaN into 0",
	fn: (input) => {
		if (isNaN(input)) {
			return 0;
		}

		return input;
	},
});

type NormalizerFn<T> = (input: T) => T;

const NormalizerIdStringList = ["cutOffAfterFirstSpace"] as const;
const NormalizerIdNumberList = ["turnNaNIntoZero"] as const;
export type StringNormalizerId = (typeof NormalizerIdStringList)[number];
export type NumberNormalizerId = (typeof NormalizerIdNumberList)[number];
export type NormalizerId = StringNormalizerId | NumberNormalizerId;

interface INormalizer<T> {
	name: string;
	fn: NormalizerFn<T>;
}

export function isNumberNormalizer(id: string | undefined): id is NumberNormalizerId {
	return NormalizerIdNumberList.includes(id as any);
}

export function isStringNormalizer(id: string | undefined): id is StringNormalizerId {
	return NormalizerIdStringList.includes(id as any);
}

export function applyStringNormalizer(id: StringNormalizerId, input: string) {
	const normalizer = stringNormalizer.get(id);
	if (normalizer === undefined) {
		throw new Error(`Unsupported normalizer: ${id} is not a known normalizer`);
	}
	return normalizer.fn(input);
}

export function applyNumberNormalizer(id: NumberNormalizerId, input: number) {
	const normalizer = numberNormalizer.get(id);
	if (normalizer === undefined) {
		throw new Error(`Unsupported normalizer: ${id} is not a known normalizer`);
	}
	return normalizer.fn(input);
}

function registerNormalizer({
	type,
	id,
	name,
	fn,
}:
	| {
			type: "string";
			id: StringNormalizerId;
			name: string;
			fn: NormalizerFn<string>;
	  }
	| {
			type: "number";
			id: NumberNormalizerId;
			name: string;
			fn: NormalizerFn<number>;
	  }) {
	if (type === "string") {
		stringNormalizer.set(id, {
			name,
			fn,
		});
	} else if (type === "number") {
		numberNormalizer.set(id, {
			name,
			fn,
		});
	}
}

export function getNormalizerList(): (
	| { type: "string"; id: StringNormalizerId; name: string }
	| { type: "number"; id: NumberNormalizerId; name: string }
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
