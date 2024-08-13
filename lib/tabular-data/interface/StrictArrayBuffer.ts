/**
 * Motivation:
 * Any TypedArray (Float63Array, Uint8Array, ...) also implements the `ArrayBuffer` interface
 * (which only has a `byteLength` property and a `slice` method). Therefore, whenever we type e.g. a function parameter
 * as `ArrayBuffer` we may actually be getting a TypedArray instead because typescript doesn't (cannot) warn the caller.
 * This can lead to hard to find bugs if we want to create e.g. a Float64 view on the passed in ArrayBuffer. Normally we
 * would just call `new Float64Array(passedInBuffer)`. If the passed in ArrayBuffer is another view however the result
 * is probably not what we expect. Consider the following example:
 * ```ts
 *  const viewInDisguise: ArrayBuffer = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
 *  const anInnocentView = new Float64Array(viewInDisguise);
 *  console.log(anInnocentView.length) // Prints 8 and not 1
 * ```
 * This type prevents these cases.
 */
export type StrictArrayBuffer = ArrayBuffer & { buffer?: undefined };
