import { PassThrough } from "node:stream";

import { LOG_LEVEL, Logger } from "~/lib/logger/Logger";

/**
 * A logger that writes nothing. Useful for testing.
 */
export class SilentLogger extends Logger {
	constructor() {
		super({ level: LOG_LEVEL.SILENT, stream: new PassThrough() });
	}
}
