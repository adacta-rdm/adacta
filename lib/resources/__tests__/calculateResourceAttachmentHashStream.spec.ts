import { Readable } from "stream";

import { createDuplex, createPipeline, createReadable } from "@omegadot/streams";
import { describe, test, expect } from "vitest";

import { calculateResourceAttachmentHashStream } from "../calculateResourceAttachmentHash";

describe("calculateResourceAttachmentHashStream", () => {
	test("readable stream (native node)", async () => {
		const stream = Readable.from(["test"]);

		expect(await calculateResourceAttachmentHashStream(stream)).toStrictEqual({
			type: "sha256",
			value: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		});
	});

	test("readable stream (@omegadot/streams)", async () => {
		const stream = createReadable(["test"]);

		expect(await calculateResourceAttachmentHashStream(stream)).toStrictEqual({
			type: "sha256",
			value: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		});
	});

	test("write to stream in parallel", async () => {
		const readable = createReadable(["test"]);
		const writable = createDuplex<string, string>();

		const tee = createDuplex<string, string>();
		createPipeline(tee, writable);

		const [hash] = await Promise.all([
			calculateResourceAttachmentHashStream(tee),
			// Must consume the writable stream so that it does not block the others attached to the input
			writable.collect(),
			createPipeline(readable, tee).promise(),
		]);

		expect(hash).toStrictEqual({
			type: "sha256",
			value: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		});
	});
});
