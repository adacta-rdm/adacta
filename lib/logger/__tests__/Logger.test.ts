import { describe, expect, test } from "bun:test";
import { Writable } from "node:stream";

import { LOG_LEVEL, Logger, logLevelFromName } from "~/lib/logger/Logger.ts";
import { SilentLogger } from "~/lib/logger/SilentLogger.ts";

/**
 * A stream that keeps what was written to it, one entry per line.
 */
function capture() {
	const lines: string[] = [];

	const stream = new Writable({
		write(chunk, _encoding, done) {
			lines.push(String(chunk).trimEnd());
			done();
		},
	});

	return { lines, stream };
}

describe("Logger", () => {
	test("writes one JSON object per line", () => {
		const { lines, stream } = capture();
		const logger = new Logger({ level: LOG_LEVEL.INFO, stream });

		logger.info("first");
		logger.info("second");

		expect(lines).toHaveLength(2);
		expect(JSON.parse(lines[0]).msg).toBe("first");
		expect(JSON.parse(lines[1]).msg).toBe("second");
	});

	test("names the level in the output", () => {
		const { lines, stream } = capture();

		new Logger({ level: LOG_LEVEL.INFO, stream }).warn("careful");

		expect(JSON.parse(lines[0]).level).toBe("WARN");
	});

	test("drops a message below its level", () => {
		const { lines, stream } = capture();
		const logger = new Logger({ level: LOG_LEVEL.WARN, stream });

		logger.info("not written");
		logger.debug("not written either");
		logger.warn("written");

		expect(lines.map((line) => JSON.parse(line).msg)).toEqual(["written"]);
	});

	test("a silent logger writes nothing", () => {
		const { lines, stream } = capture();
		const logger = new SilentLogger();

		logger.error("dropped");
		logger.warn("dropped");
		logger.info("dropped");

		// The second logger writes one line. This shows that the capture works, so
		// the missing lines above are meaningful.
		new Logger({ level: LOG_LEVEL.INFO, stream }).info("written");

		expect(lines).toHaveLength(1);
	});

	describe("bind", () => {
		test("adds the bound values to every line", () => {
			const { lines, stream } = capture();
			const logger = new Logger({ level: LOG_LEVEL.INFO, stream }).bind({ requestId: "r-1" });

			logger.info("handled");

			expect(JSON.parse(lines[0]).requestId).toBe("r-1");
		});

		test("returns a new logger and leaves the first one alone", () => {
			const { lines, stream } = capture();
			const logger = new Logger({ level: LOG_LEVEL.INFO, stream });
			const bound = logger.bind({ requestId: "r-1" });

			expect(bound).not.toBe(logger);

			logger.info("unbound");

			expect(JSON.parse(lines[0]).requestId).toBeUndefined();
		});

		test("merges with values bound earlier", () => {
			const { lines, stream } = capture();

			new Logger({ level: LOG_LEVEL.INFO, stream })
				.bind({ requestId: "r-1", repository: "demo" })
				.bind({ repository: "pilot" })
				.info("handled");

			const line = JSON.parse(lines[0]);

			expect(line.requestId).toBe("r-1");
			expect(line.repository).toBe("pilot");
		});

		test("keeps the level of the logger it came from", () => {
			const { lines, stream } = capture();
			const bound = new Logger({ level: LOG_LEVEL.WARN, stream }).bind({ requestId: "r-1" });

			bound.info("dropped");
			bound.warn("written");

			expect(lines.map((line) => JSON.parse(line).msg)).toEqual(["written"]);
		});
	});

	describe("logLevelFromName", () => {
		test("reads a configured name", () => {
			expect(logLevelFromName("debug")).toBe(LOG_LEVEL.DEBUG);
			expect(logLevelFromName(" WARN ")).toBe(LOG_LEVEL.WARN);
		});

		test("reports an unknown name", () => {
			expect(() => logLevelFromName("chatty")).toThrow(/chatty/);
		});
	});
});
