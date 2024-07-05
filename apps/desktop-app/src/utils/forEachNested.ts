import { assertDefined } from "@omegadot/assert";

interface IIterateeElement {
	key: string;
	value: Record<string, unknown> | unknown;
}

export function forEachNested(obj: Record<string, unknown>, f: (key: string, value: any) => any) {
	const stack: IIterateeElement[] = [{ value: obj, key: "__ROOT__" }];

	while (stack.length) {
		const e = stack.pop();
		assertDefined(e);
		const { value, key } = e;

		if (value instanceof String || value instanceof Number) {
			return;
		}
		f(key, value);

		if (value instanceof Object || Array.isArray(value)) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			stack.push(...Object.entries(value).map(([key, value]) => ({ key, value })));
		}
	}
}
