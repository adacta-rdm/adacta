/* eslint-disable @typescript-eslint/unified-signatures */
import { Minipass } from "minipass";

import { async } from "./async";
import type { Readable } from "./createReadable";
import type { Writable } from "./createWritable";

import { assertInstanceof } from "~/lib/assert";

interface ITransform<TIn, TOut> {
	(chunk: TIn): TOut;
}

interface ITransformCb<TIn, TOut> {
	(chunk: TIn, cb: (error: Error | null | undefined, data?: TOut) => void): void | undefined;
}

interface IAsyncGenFn<TIn, TOut> {
	(source: AsyncIterable<TIn>): AsyncGenerator<TOut>;
}

export function createDuplex<TIn = unknown, TOut = unknown>(): Duplex<TIn, TOut>;
export function createDuplex<TIn, TOut>(arg: {
	transform: ITransformCb<TIn, TOut>;
}): Duplex<TIn, TOut>;
export function createDuplex<TIn, TOut>(arg: {
	transform: ITransform<TIn, TOut>;
}): Duplex<TIn, TOut>;
export function createDuplex<TIn, TOut>(arg: {
	asyncGen: IAsyncGenFn<TIn, TOut>;
}): Duplex<TIn, TOut>;
export function createDuplex<TIn, TOut>(arg?: {
	transform?: ITransformCb<TIn, TOut> | ITransform<TIn, TOut>;
	asyncGen?: IAsyncGenFn<TIn, TOut>;
}): unknown {
	if (!arg) {
		return new Minipass({ async: async });
	}

	const { transform, asyncGen } = arg;

	if (transform) {
		const mp = new Minipass<any, any>({ async: async });
		const write = mp.write.bind(mp);

		const cb = (error: Error | null | undefined, data?: TOut): void => {
			if (error) return mp.destroy(error);

			write(data);
		};

		mp.write = (chunk: TIn) => {
			try {
				const value = transform(chunk, cb);

				// Use the return value if the supplied transform function accepts only one argument
				// (it would take 2 if it were a callback-style transform function)
				if (transform.length === 1) write(value);
			} catch (e: unknown) {
				assertInstanceof(e, Error);
				mp.destroy(e);
			}

			return mp.flowing;
		};

		return mp;
	}

	if (asyncGen) {
		const mpInternal = new Minipass<any, any>();
		const mpExternal = new Minipass<any, any>({ async: async });

		// mpInternal.on("drain", () => mpExternal.resume());

		const end = mpExternal.end.bind(mpExternal);
		const write = mpExternal.write.bind(mpExternal);

		mpExternal.write = (...args: unknown[]) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			(mpInternal.write as any)(...args);
			return mpExternal.flowing;
		};

		mpExternal.end = (...args: unknown[]) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-return
			return (mpInternal.end as any)(...args);
		};

		(async () => {
			for await (const transformedChunk of asyncGen(mpInternal)) {
				write(transformedChunk);
			}

			end();
		})().catch((e) => mpExternal.emit("error", e));

		return mpExternal;
	}
}

export type Duplex<TIn, TOut> = Readable<TOut> & Writable<TIn>;
