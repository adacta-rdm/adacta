### Rules for working with ArrayBuffers and `ArrayBufferView`s (i.e. Float64Array, ... )

1. Always type parameters as `ArrayBuffer | ArrayBufferView`
   - One can pass an `ArrayBufferView` to a function accepting an `ArrayBuffer` and
     TS won't complain.
   - By accepting both you are safe. This shouldn't cause any inconvenience if
     you use the `createView` function described below.
2. `ArrayBufferView`s have multiple constructors. The ones where you either pass a
   length or an ordinary JS array are always safe to use because a new
   `ArrayBuffer` is created internally. The third constructor accepts an
   `ArrayBuffer` (and therefore practically an `ArrayBufferView` as well). This
   constructor is dangerous. Only use it if you are certain that you are passing
   an actual `ArrayBuffer` and not an `ArrayBufferView` (ArrayBuffer.isView(...)
   should return false). If you are passing an `ArrayBufferView` the result might
   not be what one might expect, e.g.
   ```ts
   new Float64Array(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])).length;
   ```
   returns 8 and NOT 1. Never use that constructor if you are not "owning" the
   ArrayBuffer, e.g. if you call
   `.buffer` on an `ArrayBufferView` that was passed into a function. The caller
   could have called `.subarray(...)` on the `ArrayBufferView` that he passed into
   the function. By calling `.buffer` to get the underlying `ArrayBuffer` you get
   the whole ArrayBuffer, not just a subarray. If you want to have different
   views of the passed in `ArrayBuffer | ArrayBufferView` (see rule 1) use
   the `createView` function.
3. Pay attention if you a have a nodejs `Buffer`. The `Buffer` class extends `Uint8Array`.
4. To convert from `ArrayBufferView` to `Buffer` use `Buffer.from(view.buffer)`.
   Typescript won't complain if you omit `.buffer but the resulting `Buffer` will be empty.
