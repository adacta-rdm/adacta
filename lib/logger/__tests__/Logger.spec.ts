import type { Duplex } from "stream";
import { PassThrough } from "stream";

import type { JsonObject } from "type-fest";
import { describe, test, expect } from "vitest";

import { streamToString } from "../../utils/streamToString";
import { LOG_LEVEL, Logger } from "../Logger";

describe("Logger", () => {
	test("logs one JSON object per line", async () => {
		const stream = new PassThrough();

		const logger = new Logger({ level: LOG_LEVEL.INFO, stream });

		logger.info("test message 1");
		logger.info("test message 2");

		const lines = await loggerLines(stream);

		expect(lines).toHaveLength(2);
		expect(() => {
			JSON.parse(lines[0]);
			JSON.parse(lines[1]);
		}).not.toThrow();
	});

	test("includes `mergingObject` in output", async () => {
		const stream = new PassThrough();
		const logger = new Logger({ level: LOG_LEVEL.INFO, stream }, { prop1: true });

		logger.info("test message 1");

		const [json] = await loggerObjects(stream);
		expect(json.prop1).toBe(true);
	});

	describe("bind()", () => {
		test("returns a new logger instance", () => {
			const stream = new PassThrough();
			const logger1 = new Logger({ level: LOG_LEVEL.INFO, stream }, { prop1: true });
			const logger2 = logger1.bind({ prop2: true });

			expect(logger2).toBeInstanceOf(Logger);
			expect(logger1).not.toBe(logger2);
		});

		test("merges with existing `mergingObject`", async () => {
			const stream = new PassThrough();
			const logger = new Logger({ level: LOG_LEVEL.INFO, stream }, { prop1: true }).bind({
				prop1: false,
				prop2: true,
			});

			logger.info("test message 1");

			const [json] = await loggerObjects(stream);
			expect(json.prop1).toBe(false);
			expect(json.prop2).toBe(true);
		});
	});
});

async function loggerLines(stream: Duplex): Promise<string[]> {
	stream.end();

	const string = await streamToString(stream);

	return string.trim().split("\n");
}

async function loggerObjects(stream: Duplex): Promise<JsonObject[]> {
	return (await loggerLines(stream)).map((line) => JSON.parse(line) as JsonObject);
}
