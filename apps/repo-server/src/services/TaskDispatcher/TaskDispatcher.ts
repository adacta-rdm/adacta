import { StatusCodes } from "http-status-codes";

import type { IDownsamplingTaskArgs } from "../../../interface/IDownsamplingTaskArgs";
import { RemoteServicesConfig } from "../../config/RemoteServicesConfig";
import type { Point } from "../downsampler/downsampleLTTBRowMajorAsync";

import type { IPrepareImageTaskArgs } from "~/apps/repo-server/interface/IPrepareImageTaskArgs";
import type { KeyOf } from "~/lib/interface/KeyOf";
import { Logger } from "~/lib/logger/Logger";
import { Service } from "~/lib/serviceContainer/ServiceContainer";

interface ITasks {
	"resources/downsample": { args: IDownsamplingTaskArgs; result: Point[][] | undefined };
	"images/prepare": { args: IPrepareImageTaskArgs; result: undefined };
}

@Service(RemoteServicesConfig, Logger)
export class TaskDispatcher {
	constructor(private rsConfig: RemoteServicesConfig, private logger: Logger) {}

	/**
	 * Used to keep track of requests that have been dispatched.
	 * Useful to avoid running the same task again, in particular so we don't unnecessarily dispatch tasks that will
	 * error anyway.
	 *
	 * This property is currently intentionally kept in memory so that the set gets cleared between server restarts,
	 * effectively providing the ability to retry the task. An ideal solution would be to distinguish between
	 * operational and deterministic errors and store the deterministic errors persistently, but there is currently no
	 * reliable way to distinguish the errors.
	 */
	private history = new Set<string>();

	/**
	 * Creates and dispatches task from given args. The dispatcher may choose to queue the task's execution when there
	 * are not enough computational resources available.
	 */
	async dispatch<T extends KeyOf<ITasks>>(
		type: T,
		args: ITasks[T]["args"]
	): Promise<ITasks[T]["result"]> {
		// MUST END WITH A SLASH!
		const base = this.rsConfig.baseURL.toString();
		const url = `${base}${type}`;
		const key = JSON.stringify(args);
		const logger = this.logger.bind({ type, url }); // TODO: Re-add {input: args.input.path };

		logger.bind({ args: key }).trace("");
		logger.info(`Dispatching task`);

		// Only dispatch the task if it has not run before
		if (!this.history.has(key)) {
			this.history.add(key);

			try {
				const response = await global.fetch(url.toString(), {
					method: "post",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(args),
				});

				const msg = `Task response received with status ${response.status} (${response.statusText})`;
				if (response.status === StatusCodes.OK) {
					logger.info(msg);
				} else {
					logger.warn(msg);
				}

				const json: unknown = await response.json();

				if (type === "resources/downsample") {
					if (!Array.isArray(json) || !Array.isArray(json[0]) || !Array.isArray(json[0][0])) {
						throw new Error("Invalid response from server: Expected array of arrays of points.");
					}

					return json as Point[][];
				} else if (type === "images/prepare") {
					return;
				}
			} catch (e) {
				this.history.delete(key);

				if (!(e instanceof Error)) throw e;
				logger.error(e.message);
			}
		}
	}
}
