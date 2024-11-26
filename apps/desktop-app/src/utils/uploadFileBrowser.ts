import type { AxiosRequestConfig } from "axios";
import axios from "axios";

import { isIUploadResourceAttachmentResponse } from "@/tsrc/lib/interface/IUploadResourceAttachmentResponse";
import { readFile } from "~/apps/desktop-app/src/utils/readFile";
import { assertDefined } from "~/lib/assert/assertDefined";
import { calculateResourceAttachmentHashBrowser } from "~/lib/resources/calculateResourceAttachmentHashBrowser";

export async function uploadFileBrowser(file: File, uploadURL: string): Promise<string | void> {
	const s3Mode = uploadURL.includes("s3");
	const formData = new FormData();

	const data = await readFile(file);

	const hash = await calculateResourceAttachmentHashBrowser(new Uint8Array(data));

	formData.append("hashType", hash.type);
	formData.append("hashValue", hash.value);
	formData.append("resource", file);

	const headers = s3Mode
		? { "Content-Type": "application/octet-stream" }
		: { "Content-Type": "multipart/form-data" };

	const requestConfig: AxiosRequestConfig = {
		maxBodyLength: 100e6,
		headers,
	};

	const response = s3Mode
		? await axios.put(uploadURL, file, requestConfig)
		: await axios.post(uploadURL, formData, requestConfig);

	if (!s3Mode) {
		if (response.status !== 200 || !isIUploadResourceAttachmentResponse(response.data)) {
			throw new Error("Unexpected answer for HTTP Request");
		}

		if (!response.data.result) {
			throw new Error(response.data.message);
		}

		assertDefined(response.data.uploadId);

		return response.data.uploadId;
	}
}
