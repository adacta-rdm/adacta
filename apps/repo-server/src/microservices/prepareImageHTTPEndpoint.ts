import bmpDecode from "@vingle/bmp-js";
import heicDecode from "heic-decode";
import { StatusCodes } from "http-status-codes";
import sharp from "sharp";

import { isIPrepareImageTaskArgs } from "@/tsrc/apps/repo-server/interface/IPrepareImageTaskArgs";
import { uploadFile } from "~/apps/desktop-app/src/utils/uploadFile";
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
		const response = await fetch(params.input.inputDownloadURL);
		const data = await response.arrayBuffer();

		let sharpInstance!: sharp.Sharp;

		logger.debug(`Processing image with type: '${params.input.originalMimeType}'`);

		const mimeType = params.input.originalMimeType.toLowerCase();

		if (mimeType.includes("heif") || mimeType.includes("heic")) {
			// Sharp does not support HEIC images, when the prebuilt "libvips" is used.
			// To handle HEIC images (and HEIF images as well), we use the "heic-decode" package.
			const buffer = Buffer.from(new Uint8Array(data));
			const decodeResult = await heicDecode({ buffer });
			const { data: rawData, width, height } = decodeResult;
			sharpInstance = sharp(rawData, { raw: { width, height, channels: 4 } });
		} else if (mimeType.includes("bmp")) {
			// Decode BMP images using the "bmp-js" package
			const buffer = Buffer.from(new Uint8Array(data));
			const bitmap = bmpDecode.decode(buffer, true);
			sharpInstance = sharp(bitmap.data, {
				raw: {
					width: bitmap.width,
					height: bitmap.height,
					channels: 4,
				},
			});
		} else {
			sharpInstance = sharp(data, {
				// failOn controls when to abort processing of invalid pixel data
				// This is set to "none" to process the image "as is" without throwing an error
				failOn: "none",
			});
		}

		const selectType = (sharp: sharp.Sharp, type: "jpg" | "png" | "webp") => {
			switch (type) {
				case "jpg":
					return sharp.jpeg();
				case "png":
					return sharp.png();
				case "webp":
					return sharp.webp();
			}
		};

		const transformer = selectType(
			sharpInstance
				.resize({
					width: options.maxDimensions.width,
					height: options.maxDimensions.height,
					fit: sharp.fit.inside, // Keep aspect ratio with width and height as maximum values
				})
				.rotate(),
			options.type
		); // Auto-rotate based on EXIF data

		await uploadFile(
			sliceBufferAndCopyToNewArrayBuffer(await transformer.toBuffer()),
			params.input.resultUploadURL
		);

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
