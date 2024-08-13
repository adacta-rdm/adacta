import { Minipass } from "minipass";

import type { Readable } from "./createReadable";

export function isReadable(arg: unknown): arg is Readable<unknown> {
	return arg instanceof Minipass;
}
