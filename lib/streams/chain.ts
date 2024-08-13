import { pipeline } from "stream/promises";

import type { Readable } from "./createReadable";
import type { Writable } from "./createWritable";

/**
 * Simple wrapper around node:stream/promises' `pipeline` function that accepts our custom stream types.
 */
export function chain<TIn>(head: Readable<TIn>, tail: Writable<TIn>): Promise<void>;
export function chain(...args: unknown[]): Promise<void> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
	return (pipeline as any)(...args);
}
