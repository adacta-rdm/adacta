type NormalizerFn = (input: string) => string;

const NormalizerIdList = ["cutOffAfterFirstSpace", "turnNaNIntoZero"] as const;
export type NormalizerId = (typeof NormalizerIdList)[number];

interface INormalizer {
	name: string;
	fn: NormalizerFn;
}

const normalizers = new Map<NormalizerId, INormalizer>();

registerNormalizer(
	"cutOffAfterFirstSpace",
	"Cut of after first space",
	(input) => input.split(" ")[0]
);
registerNormalizer("turnNaNIntoZero", "Turn NaN into 0", (input) => {
	if (isNaN(Number(input))) {
		return "0";
	}

	return input;
});

export function applyNormalizer(id: NormalizerId, input: string) {
	const normalizer = normalizers.get(id);
	if (normalizer === undefined) {
		throw new Error(`Unsupported normalizer: ${id} is not a known normalizer`);
	}
	return normalizer.fn(input);
}

function registerNormalizer(id: NormalizerId, name: string, fn: NormalizerFn) {
	normalizers.set(id, { name, fn });
}

export function getNormalizerList(): [NormalizerId, string][] {
	return [...normalizers.entries()].map(([id, { name }]) => [id, name]);
}
