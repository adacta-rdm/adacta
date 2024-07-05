import type { Writable } from "stream";

import type { JsonObject } from "type-fest";

export enum LOG_LEVEL {
	SILENT,
	FATAL,
	ERROR,
	WARN,
	INFO,
	DEBUG,
	TRACE,
}

interface ILoggerOptions {
	level?: LOG_LEVEL;
	stream: Writable;
}

/**
 * A simple logger interface that writes to the specified stream.
 */
export class Logger {
	private level: LOG_LEVEL;
	private stream: Writable;

	constructor(options: ILoggerOptions, private mergingObject: JsonObject = {}) {
		this.level = options.level ?? LOG_LEVEL.INFO;
		this.stream = options.stream;
	}

	bind(mergingObject: JsonObject): Logger {
		const bound = Object.create(Logger.prototype) as Logger;
		Object.assign(bound, this, { mergingObject: { ...this.mergingObject, ...mergingObject } });
		return bound;
	}

	trace(msg: string): void {
		this.log(LOG_LEVEL.TRACE, msg);
	}

	debug(msg: string): void {
		this.log(LOG_LEVEL.DEBUG, msg);
	}

	info(msg: string): void {
		this.log(LOG_LEVEL.INFO, msg);
	}

	error(msg: string): void {
		this.log(LOG_LEVEL.ERROR, msg);
	}

	warn(msg: string): void {
		this.log(LOG_LEVEL.WARN, msg);
	}

	protected log(level: LOG_LEVEL, msg: string): void {
		if (level <= this.level) {
			this.stream.write(
				`${JSON.stringify({ level, time: Date.now(), ...this.mergingObject, msg })}\n`
			);
		}
	}
}
