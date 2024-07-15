import { assertDefined } from "@omegadot/assert";
import type { AxiosRequestConfig } from "axios";
import axios from "axios";
import FormData from "form-data";

import { isIUploadResourceAttachmentResponse } from "@/tsrc/lib/interface/IUploadResourceAttachmentResponse";
import type { IResourceId } from "~/lib/database/Ids";
import type { StrictArrayBuffer } from "~/lib/interface/StrictArrayBuffer";
import { calculateResourceAttachmentHash } from "~/lib/resources/calculateResourceAttachmentHash";

export async function uploadFile(
	contents: StrictArrayBuffer,
	uploadURL: string,
	resourceId?: IResourceId
): Promise<string | void> {
	const s3Mode = uploadURL.includes("s3");
	const resourceAttachmentData = contents;
	const formData = new FormData();
	const hash = calculateResourceAttachmentHash(Buffer.from(resourceAttachmentData));

	formData.append("hashType", hash.type);
	formData.append("hashValue", hash.value);
	if (resourceId) {
		formData.append("resourceId", resourceId);
	}
	formData.append("resource", Buffer.from(resourceAttachmentData), {
		knownLength: resourceAttachmentData.byteLength,
	});

	const headers = s3Mode
		? { "Content-Type": "application/octet-stream" }
		: { "Content-Type": "multipart/form-data" };

	const requestConfig: AxiosRequestConfig = {
		maxBodyLength: 100e6,
		headers: {
			...formData.getHeaders(),
			...headers,
		},
	};

	//const response = await axios.post(uploadURL, formData.getBuffer(), requestConfig);
	const response = s3Mode
		? await axios.put(uploadURL, contents, requestConfig)
		: await axios.post(uploadURL, formData.getBuffer(), requestConfig);

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
