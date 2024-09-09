import { StatusCodes } from "http-status-codes";

import { isIPrepareImageTaskArgs } from "@/tsrc/apps/repo-server/interface/IPrepareImageTaskArgs";
import { uploadFile } from "~/apps/desktop-app/src/utils/uploadFile";
import { doPrepareImage } from "~/apps/repo-server/src/services/ImagePreparation/doPrepareImage";
import { sliceBufferAndCopyToNewArrayBuffer } from "~/apps/repo-server/src/sliceBufferAndCopyToNewArrayBuffer";
import type { IHTTPEndpointArgs } from "~/lib/interface/IHTTPEndpointArgs";
import type { IHTTPEndpointReturnType } from "~/lib/interface/IHTTPEndpointReturnType";
import { LOG_LEVEL, Logger } from "~/lib/logger/Logger";

export async function prepareImageHTTPEndpoint(
	args: IHTTPEndpointArgs
): Promise<IHTTPEndpointReturnType<{ error?: string }>> {
	const logger = new Logger({ level: LOG_LEVEL.DEBUG, stream: process.stdout });

	// Explicitly construct the params object with only known properties, because the validation function
	// will fail when there are any additional unknown properties defined.
	const { input } = args.params;
	const params = {
		input,
	};

	if (!isIPrepareImageTaskArgs(params)) {
		logger.warn("Received invalid request parameters.");
		return {
			statusCode: StatusCodes.BAD_REQUEST,
			body: { error: "Invalid request parameters." },
		};
	}

	try {
		const options = params.input.options;
		const { inputDownloadURL, originalMimeType } = params.input;
		const buffer = await doPrepareImage(inputDownloadURL, originalMimeType, options, logger);

		await uploadFile(sliceBufferAndCopyToNewArrayBuffer(buffer), params.input.resultUploadURL);

		return {
			statusCode: StatusCodes.OK,
			headers: { "content-type": "application/json" },
			body: {},
		};
	} catch (e) {
		logger.error(e instanceof Error ? e.message : "Unknown error");

		return {
			statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
			body: { error: e instanceof Error ? e.message : "Unknown error" },
		};
	}
}
