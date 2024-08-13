import { StatusCodes } from "http-status-codes";

import { S3Config } from "../config/S3Config";
import { downsample as doDownsample } from "../services/downsampler/downsample";
import type { Point } from "../services/downsampler/downsampleLTTBRowMajorAsync";

import { isIDownsamplingTaskArgs } from "@/tsrc/apps/repo-server/interface/IDownsamplingTaskArgs";
import type { IHTTPEndpointArgs } from "~/lib/interface/IHTTPEndpointArgs";
import type { IHTTPEndpointReturnType } from "~/lib/interface/IHTTPEndpointReturnType";
import { LOG_LEVEL, Logger } from "~/lib/logger/Logger";
import { S3StorageEngine } from "~/lib/storage-engine";

export async function downsampleHTTPEndpoint(
	args: IHTTPEndpointArgs
): Promise<IHTTPEndpointReturnType<Point[][]>> {
	const logger = new Logger({ level: LOG_LEVEL.DEBUG, stream: process.stdout });

	// Explicitly construct the params object with only known properties, because the validation function
	// will fail when there are any additional unknown properties defined.
	const { input, threshold } = args.params;
	const params = {
		input,
		threshold,
	};

	if (!isIDownsamplingTaskArgs(params)) {
		logger.warn("Received invalid request parameters.");
		return {
			statusCode: StatusCodes.BAD_REQUEST,
		};
	}

	try {
		const sto = new S3StorageEngine(new S3Config({ prefix: params.input.prefix }));

		return {
			statusCode: StatusCodes.OK,
			headers: { "content-type": "application/json" },
			body: await doDownsample({ sto, logger }, params),
		};
	} catch (e) {
		logger.error(e instanceof Error ? e.message : "Unknown error");

		return {
			statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
		};
	}
}
