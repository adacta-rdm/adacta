export interface PrepareImageTaskArgs {
	input: {
		inputDownloadURL: string;
		resultUploadURL: string;
		options: ImageOptions;
		originalMimeType: string;
		originalWidth: number;
		originalHeight: number;
	};
}

interface ImageOptions {
	type: "webp" | "jpg" | "png";
	maxDimensions: { width: number; height: number };
}
