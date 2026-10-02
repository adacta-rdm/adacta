/**
 * Reads an ID that is written as text, for example in a URL. The text must
 * consist of decimal digits without a leading zero. Each ID therefore has one
 * spelling. The value must not exceed `Number.MAX_SAFE_INTEGER`. Any other
 * text gives `undefined`.
 *
 * For example, `parseId53("1234567890123")` returns `1234567890123`. However,
 * `parseId53("1e3")` and `parseId53("007")` return `undefined`.
 */
export function parseId53(text: string): number | undefined {
	if (!/^(0|[1-9][0-9]*)$/.test(text)) return undefined;

	const id = Number(text);

	return id <= Number.MAX_SAFE_INTEGER ? id : undefined;
}
