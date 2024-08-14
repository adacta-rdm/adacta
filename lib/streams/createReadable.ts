import type stream from "node:stream";

import { Minipass } from "minipass";

import type { IEventDef } from "./IEventDef";
import { async } from "./async";
import type { Writable } from "./createWritable";

/**
 * Use this to produce a ReadableMinipass instance from a variety of sources:
 * - AsyncIterable
 * - stream.Readable
 */
export function createReadable(source: stream.Readable): Readable<Buffer | string>;
export function createReadable<TOut>(
	iterable: Iterable<TOut> | AsyncIterable<TOut> | Generator<TOut> | (() => AsyncGenerator<TOut>)
): Readable<TOut>;
export function createReadable(arg: unknown): unknown {
	// No need to do anything if we're already passed a Minipass instance
	if (arg instanceof Minipass) {
		arg.async = async;
		return arg;
	}

	if (typeof arg === "function") {
		arg = arg();
	}

	if (isAsyncIterable(arg)) {
		const mp = new Minipass<any>({ async: async });
		(async () => {
			for await (const value of arg) {
				if (!mp.write(value)) {
					await new Promise((resolve) => mp.once("drain", resolve));
				}
			}
			mp.end();
		})().catch((e) => mp.emit("error", e));

		return mp;
	}

	if (isIterable(arg)) {
		const mp = new Minipass<any>({ async: async });

		(async () => {
			for (const value of arg) {
				if (!mp.write(value)) {
					await new Promise((resolve) => mp.once("drain", resolve));
				}
			}
			mp.end();
		})().catch((e) => mp.emit("error", e));

		return mp;
	}
}

type Events<TOut> = IEventDef<"error", [Error]> &
	/**
	 * Emitted when there's data to read. Argument is the data to read. This is never emitted while not flowing. If a
	 * listener is attached, that will resume the stream.
	 */
	IEventDef<"data", [TOut]> &
	/**
	 * An indication that an underlying resource has been released. Minipass does not emit this event, but will defer it
	 * until after end has been emitted, since it throws off some stream libraries otherwise.
	 */
	IEventDef<"close", []> &
	IEventDef<"end", []>;
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface Readable<TOut> extends Events<TOut> {
	// read(): TOut;

	// pause(): void;
	// resume(): void;

	/**
	 * Send all output to the stream provided.
	 *
	 * @param dest - The stream where incoming data should be passed to.
	 * @param options - The proxyErrors option forwards errors to the destination stream, i.e. `src.on('error', e => dest.emit('error', e)).pipe(dest)`
	 */
	pipe<T extends Writable<TOut>>(dest: T, options?: { proxyErrors: boolean }): T;

	/**
	 * Return a Promise that resolves on end with an array containing each chunk of data that was emitted, or rejects if
	 * the stream emits error. Note that this consumes the stream data.
	 */
	collect(): Promise<TOut[]>;

	/**
	 * Return a Promise that resolves on end with an array containing each chunk of data that was emitted, or rejects if
	 * the stream emits error. Note that this consumes the stream data.
	 */
	concat(): Promise<TOut extends Buffer | string ? TOut : never>;

	/**
	 * Returns a Promise that resolves when the stream emits 'end', or rejects if the stream emits 'error'.
	 */
	promise(): Promise<void>;

	/**
	 * Destroy the stream. If an error is provided, then an 'error' event is emitted. If the stream has a close()
	 * method, and has not emitted a 'close' event yet, then stream.close() will be called. Any Promises returned by
	 * .promise(), .collect() or .concat() will be rejected.
	 *
	 * After being destroyed, writing to the stream will emit an error. No more data will be emitted if the stream is
	 * destroyed, even if it was previously buffered.
	 *
	 * @param error - Optional Error object to indicate that the stream was destroyed due to an error.
	 */
	destroy(error?: Error): void;

	[Symbol.asyncIterator](): AsyncIterator<TOut>;

	// emit(event: "error", error: Error): boolean;
	//
	// on(event: "data", listener: (chunk: TOut) => unknown): this;
	// on(event: "error", listener: (error: Error) => unknown): this;
}

function isAsyncIterable(obj: unknown): obj is AsyncIterable<unknown> {
	return typeof obj === "object" && obj !== null && Symbol.asyncIterator in obj;
	// // if (Object(obj) !== obj) return false;
	//
	// const method = obj[Symbol.asyncIterator];
	// if (typeof method != "function") return false;
	// const aIter = method.call(obj);
	// return aIter === obj;
}

function isIterable(obj: unknown): obj is Iterable<unknown> {
	return typeof obj === "object" && obj !== null && Symbol.iterator in obj;
	// // if (Object(obj) !== obj) return false;
	//
	// const method = obj[Symbol.asyncIterator];
	// if (typeof method != "function") return false;
	// const aIter = method.call(obj);
	// return aIter === obj;
}
// https://stackoverflow.com/questions/70337056/verify-iterator-versus-asynciterator-type
