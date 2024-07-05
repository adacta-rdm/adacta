import { PassThrough } from "stream";

import { LOG_LEVEL, Logger } from "./Logger";

/* eslint-disable class-methods-use-this */

/**
 * A logger that does not log anything.
 */
export class SilentLogger extends Logger {
	constructor() {
		super({ level: LOG_LEVEL.SILENT, stream: new PassThrough() });
	}

	trace(): void {}

	debug(): void {}

	info(): void {}

	error(): void {}

	warn(): void {}
}
