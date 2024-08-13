import { async } from "./async";
import type { Duplex } from "./createDuplex";
import type { Readable } from "./createReadable";
import type { Writable } from "./createWritable";
import { Pipeline } from "./minipass-pipeline";

export function createPipeline<TIn, TOut>(): Duplex<TIn, TOut> & {
	unshift(readable: Readable<TIn>): void;
	push(readable: Writable<TOut>): void;
};
export function createPipeline<TIn, TOut, T>(
	head: Duplex<TIn, T>,
	tail: Duplex<T, TOut>
): Duplex<TIn, TOut>;
export function createPipeline<TIn, TOut>(
	head: Readable<TIn>,
	tail: Duplex<TIn, TOut>
): Readable<TOut>;
export function createPipeline<TIn, TOut>(
	head: Duplex<TIn, TOut>,
	tail: Writable<TOut>
): Writable<TIn>;
export function createPipeline<TIn>(head: Readable<TIn>, tail: Writable<TIn>): Duplex<never, never>;
export function createPipeline(...args: unknown[]): unknown {
	const p = new Pipeline(...args);
	p.async = async;
	return p;
}
