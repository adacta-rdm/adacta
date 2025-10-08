import { ReadableStream as ReadableWeb } from "node:stream/web";

import type { Readable as OmegadotReadable } from "~/lib/streams";

/**
 * Converts a "Readable" (from @omegadot/streams or similar) to "ReadableStream" (from the
 * Streams API https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Concepts)
 * @param nodeStream
 */
export function omegadotStreamToWeb<T>(nodeStream: OmegadotReadable<T>) {
	return ReadableWeb.from(nodeStream) as ReadableStream<T>;
}
