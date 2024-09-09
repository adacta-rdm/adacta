export interface IPrepareImageTaskArgs {
	input: {
		inputDownloadURL: string; // The URL to fetch the image from
		resultUploadURL: string; // The URL to upload the image to

		options: IImageOptions;

		originalMimeType: string;
	};
}

export interface IImageOptions {
	type: ImageTypes;
	maxDimensions: { width: number; height: number };
}

type ImageTypes = "webp" | "jpg" | "png";
