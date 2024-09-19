import bmpDecode from "@vingle/bmp-js";
import heicDecode from "heic-decode";
import sharp from "sharp";

import type { IImageOptions } from "~/apps/repo-server/interface/IPrepareImageTaskArgs";
import type { Logger } from "~/lib/logger/Logger";

/**
 * Handles the actual image processing for the image preparation service.
 * @param inputDownloadURL url to access the image
 * @param inputMimeType mime type of the input image
 * @param options additional options for image processing (e.g. type, max dimensions)
 * @param logger
 */
export async function doPrepareImage(
	inputDownloadURL: string,
	inputMimeType: string,
	options: IImageOptions,
	logger: Logger
) {
	const response = await fetch(inputDownloadURL);
	const data = await response.arrayBuffer();

	let sharpInstance!: sharp.Sharp;

	logger.debug(`Processing image with type: '${inputMimeType}'`);

	const mimeType = inputMimeType.toLowerCase();

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
			.rotate(), // Auto-rotate based on EXIF data
		options.type
	);
	return transformer.toBuffer();
}
