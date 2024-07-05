import { clearTimeout } from "timers";

import type { JsonObject } from "type-fest";

import type { Logger } from "~/lib/logger/Logger";
import { uuid } from "~/lib/uuid";

export class PerformanceTracker {
	private logger: Logger;
	private warningThresholdMs: number;

	constructor(logger: Logger, warningThresholdMs = 1000) {
		// TODO: Add some way to preserve the original class name as well?
		this.logger = logger.bind({ class: "PerformanceTracker" });
		this.warningThresholdMs = warningThresholdMs;
	}

	public async track<T>(name: string, descriptor: JsonObject, fn: () => Promise<T>): Promise<T> {
		const id = uuid();
		const start = Date.now();

		const timeout = setTimeout(() => {
			const logger = this.logger.bind({
				slowTaskName: name,
				slowTaskDescription: descriptor,
			});
			logger.warn(
				`Task ${name} (${id}) is taking longer than ${this.warningThresholdMs}ms (still running)`
			);
		}, this.warningThresholdMs);

		let result: Awaited<T>;

		try {
			result = await fn();
			// The following catch is necessary since otherwise the finally block will swallow the error
			// eslint-disable-next-line no-useless-catch
		} catch (e) {
			throw e;
		} finally {
			// Timeout clearing + Reporting is done in the finally block to ensure that it is always
			// executed (even if promise returned by fn() is rejected
			clearTimeout(timeout);
			const end = Date.now();

			const duration = end - start;
			if (duration > this.warningThresholdMs) {
				const logger = this.logger.bind({
					slowTaskName: name,
					slowTaskDescription: descriptor,
					slowTaskDuration: duration,
				});
				logger.warn(`${name} (${id}) taking ${duration}ms detected`);
			}
		}

		return result;
	}
}
