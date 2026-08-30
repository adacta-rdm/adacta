import type { Writable } from "node:stream";

import type { JsonObject } from "type-fest";

/**
 * A message is written when its level is at or below the level of
 * the logger. For example, a logger set to WARN writes only warnings,
 * errors, and fatal errors. Other messages are ignored.
 */
export enum LOG_LEVEL {
	SILENT,
	FATAL,
	ERROR,
	WARN,
	INFO,
	DEBUG,
	TRACE,
}

const LEVEL_BY_NAME: Record<string, LOG_LEVEL> = {
	silent: LOG_LEVEL.SILENT,
	fatal: LOG_LEVEL.FATAL,
	error: LOG_LEVEL.ERROR,
	warn: LOG_LEVEL.WARN,
	info: LOG_LEVEL.INFO,
	debug: LOG_LEVEL.DEBUG,
	trace: LOG_LEVEL.TRACE,
};

/**
 * Read a level from a configured name such as "debug".
 */
export function logLevelFromName(name: string): LOG_LEVEL {
	const level = LEVEL_BY_NAME[name.trim().toLowerCase()];

	if (level === undefined) {
		throw new Error(
			`Unknown log level "${name}". Expected one of ${Object.keys(LEVEL_BY_NAME).join(", ")}.`,
		);
	}

	return level;
}

type LoggerOptions = {
	level: LOG_LEVEL;
	stream: Writable;
};

/**
 * Writes messages to a stream, one JSON object per line. A program can read the
 * output without parsing free text.
 */
export class Logger {
	readonly #level: LOG_LEVEL;
	readonly #stream: Writable;
	readonly #context: JsonObject;

	constructor({ level, stream }: LoggerOptions, context: JsonObject = {}) {
		this.#level = level;
		this.#stream = stream;
		this.#context = context;
	}

	/**
	 * Return a logger that adds the same values to every line. For example, a
	 * request handler binds the request id once. Every message it writes then
	 * carries that id. This logger is not changed.
	 */
	bind(context: JsonObject): Logger {
		return new Logger(
			{ level: this.#level, stream: this.#stream },
			{ ...this.#context, ...context },
		);
	}

	trace(message: string): void {
		this.#write(LOG_LEVEL.TRACE, message);
	}

	debug(message: string): void {
		this.#write(LOG_LEVEL.DEBUG, message);
	}

	info(message: string): void {
		this.#write(LOG_LEVEL.INFO, message);
	}

	warn(message: string): void {
		this.#write(LOG_LEVEL.WARN, message);
	}

	error(message: string): void {
		this.#write(LOG_LEVEL.ERROR, message);
	}

	#write(level: LOG_LEVEL, message: string): void {
		if (level > this.#level) return;

		this.#stream.write(
			`${JSON.stringify({
				level: LOG_LEVEL[level],
				time: Date.now(),
				...this.#context,
				msg: message,
			})}\n`,
		);
	}
}
