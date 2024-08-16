import assert from "assert";

import { assertUnreachable } from "@omegadot/assert";
import type { FormatEnum } from "sharp";

import type { IImageOptions } from "~/apps/repo-server/interface/IPrepareImageTaskArgs";
import { IImagePreset } from "~/apps/repo-server/src/graphql/generated/resolvers";
import { TaskDispatcher } from "~/apps/repo-server/src/services/TaskDispatcher/TaskDispatcher";
import type { StorageEngineRemoteAccess } from "~/apps/repo-server/src/storage/storageEngine/remoteAccess/StorageEngineRemoteAccess";
import type { DrizzleEntity } from "~/drizzle/DrizzleSchema";
import type { IResourceId } from "~/lib/database/Ids";
import { Service, ServiceContainer } from "~/lib/serviceContainer/ServiceContainer";
import type { StorageEngine } from "~/lib/storage-engine";

/**
 * This service is responsible for preparing images for display.
 * It will take an image resource and does the following:
 * 	- Resize the image to the desired size
 * 	- Convert the image to suitable format
 * 	- If necessary the image is rotated to the correct orientation (provided by the EXIF data)
 */
@Service()
export class ImagePreparation {
	private map = new Set<string>();

	/**
	 * Filetypes supported by sharp
	 * @private
	 */
	private static sharpExtension: Partial<Record<keyof FormatEnum, string>> = {
		avif: "image/avif",
		gif: "image/gif",
		jpeg: "image/jpeg",
		jpg: "image/jpeg",
		pdf: "application/pdf",
		png: "image/png",
		svg: "image/svg+xml",
		tiff: "image/tiff",
		tif: "image/tiff",
		webp: "image/webp",
	};

	/**
	 * Filetypes with custom handling
	 * @private
	 */
	private static customExtensions = {
		heic: "image/heic",
		heif: "image/heif",
		bmp: "image/bmp",
	};

	private static supportedMimeTypes: string[] = Object.values({
		...ImagePreparation.sharpExtension,
		...ImagePreparation.customExtensions,
	});

	private static IMAGE_SIZES = {
		icon: { width: 25, height: 25 },
		thumbnail: { width: 200, height: 200 },
		regular: { width: 1920, height: 1080 },
	};

	public async getImage(
		resource: DrizzleEntity<"Resource">,
		sto: StorageEngine,
		stoRemote: StorageEngineRemoteAccess,
		preset: IImagePreset
	) {
		return {
			url: await this.requestImage(resource, sto, stoRemote, preset),
			fallbackURL: await this.requestImage(resource, sto, stoRemote, preset),
		};
	}

	private static isPictureType(type: string) {
		const t = type.toLowerCase();
		return t === "jpg" || t === "jpeg" || t === "heic";
	}

	public static isSupportedMimeType(mime: string) {
		return ImagePreparation.supportedMimeTypes.includes(mime);
	}

	private static getOptions(preset: IImagePreset, extension: string): IImageOptions {
		switch (preset) {
			case IImagePreset.Icon:
				return { type: "png", maxDimensions: ImagePreparation.IMAGE_SIZES["icon"] };
			case IImagePreset.Thumbnail:
				if (ImagePreparation.isPictureType(extension))
					return { type: "jpg", maxDimensions: ImagePreparation.IMAGE_SIZES["thumbnail"] };
				return { type: "png", maxDimensions: ImagePreparation.IMAGE_SIZES["thumbnail"] };
			case IImagePreset.Regular:
				if (ImagePreparation.isPictureType(extension))
					return { type: "jpg", maxDimensions: ImagePreparation.IMAGE_SIZES["regular"] };
				return { type: "png", maxDimensions: ImagePreparation.IMAGE_SIZES["regular"] };
			default:
				assertUnreachable(preset);
		}
	}

	public async requestImage(
		resource: DrizzleEntity<"Resource">,
		sto: StorageEngine,
		stoRemote: StorageEngineRemoteAccess,
		preset: IImagePreset
	) {
		assert(resource.attachment.type === "Image");
		const options = ImagePreparation.getOptions(preset, resource.attachment.mimeType.split("/")[1]);
		const imagePath = ImagePreparation.getPath(resource.id, options);

		const getImageLink = (path: string) => {
			return stoRemote.getDownloadLink(path, undefined, 60 * 60 * 60 * 24 * 7);
		};

		// If the image is already prepared, return the download link directly without a call
		// to S3
		if (this.map.has(imagePath)) {
			return getImageLink(imagePath);
		}

		// If the image is available in the storage engine, return the download link directly
		// without a call to
		if (await sto.exists(imagePath)) {
			this.map.add(imagePath);
			return getImageLink(imagePath);
		}

		const downloadLink = await stoRemote.getDownloadLink(resource.id);
		const uploadLink = await stoRemote.getUploadLink(imagePath);

		await ServiceContainer.get(TaskDispatcher).dispatch("images/prepare", {
			input: {
				inputDownloadURL: downloadLink,
				resultUploadURL: uploadLink,
				originalMimeType: resource.attachment.mimeType,
				options,
			},
		});

		this.map.add(imagePath);

		return getImageLink(imagePath);
	}

	private static getPath(resourceId: IResourceId, options: IImageOptions) {
		const sizeString = `${options.maxDimensions.height}x${options.maxDimensions.width}`;
		const typeString = options.type;

		return `images/${resourceId}_${sizeString}.${typeString}`;
	}
}
