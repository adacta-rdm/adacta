import type { Writable as NodeWritable } from "node:stream";

import type { EventDef } from "./EventDef";
import { createPipeline } from "./createPipeline";

export function createWritable(writable: NodeWritable): Writable<Buffer> {
	// TODO: Create helper function to wrap native node streams
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
	return (createPipeline as any)(writable);
}

type Events = EventDef<"error", [Error]> &
	/**
	 * Emitted when the internal buffer empties, and it is again suitable to
	 * write() into the stream.
	 */
	EventDef<"drain", []> &
	/**
	 * Emitted after the stream.end() method has been called, and all data has been flushed to the underlying system.
	 */
	EventDef<"finish", []>;

export interface Writable<TIn> extends Events {
	end(data?: TIn): this;

	/**
	 * Put data in. Returns false if the stream will buffer the next write,
	 * or true if it's still in "flowing" mode.
	 *
	 *
	 * @param chunk - The chunk of data to write to the stream
	 */
	write(chunk: TIn): boolean;

	/**
	 * Destroy the stream. If an error is provided, then an 'error' event is emitted. If the stream has a close()
	 * method, and has not emitted a 'close' event yet, then stream.close() will be called. Any Promises returned by
	 * .promise(), .collect() or .concat() will be rejected.
	 *
	 * After being destroyed, writing to the stream will emit an error. No more data will be emitted if the stream is
	 * destroyed, even if it was previously buffered.
	 */
	destroy(error?: Error): void;

	/**
	 * Returns a Promise that resolves when the stream emits 'end', or rejects if the stream emits 'error'.
	 */
	promise(): Promise<void>;

	/**
	 * Boolean indicating whether a chunk written to the stream will be immediately emitted.
	 * This means that if this is false and write is called, then the data will be buffered.
	 */
	readonly flowing: boolean;

	/**
	 * Whether the stream is writable. Default true. Set to false when end() has been called.
	 */
	readonly writable: boolean;
}
