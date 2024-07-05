/**
 * Generated file. Do not edit!
 */
/* eslint-disable */
import { IUploadResourceAttachmentResponse } from "../IUploadResourceAttachmentResponse";
import { validateIUploadResourceAttachmentResponse } from "./validateIUploadResourceAttachmentResponse";

export function assertIUploadResourceAttachmentResponse(arg: any): asserts arg is IUploadResourceAttachmentResponse {
	const errors = validateIUploadResourceAttachmentResponse(arg);
	if(errors.length > 0) throw new Error("Cannot convert to type IUploadResourceAttachmentResponse: " + errors[0].message);
}
