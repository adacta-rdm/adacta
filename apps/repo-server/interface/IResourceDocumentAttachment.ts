import type { IFileHash } from "./IFileHash";

import type { IDatetime } from "~/lib/createDate";
import type { IDeviceId } from "~/lib/database/Ids";
import type { ITabularDataColumnDescription } from "~/lib/interface/ITabularDataColumnDescription";

interface IResourceDocumentAttachmentBase {
	/**
	 * Describes how to interpret the underlying set of bytes.
	 */
	type: string;

	/**
	 * Hash of the resource attachment
	 */
	hash: IFileHash;
}

export interface IResourceDocumentAttachmentRaw extends IOptionallyTimedResourceAttachment {
	type: "Raw";

	/**
	 * Id of the device where the resource was imported to. Provides the needed context for the import wizard, since
	 * the import wizard expects a raw resource to be already present.
	 */
	uploadDevice?: IDeviceId;
}

export interface IResourceDocumentAttachmentTabularData extends IStrictlyTimedResourceAttachment {
	type: "TabularData";

	/**
	 * 8 bytes per element corresponds to a double precision number.
	 */
	bytesPerElement: 8;

	columns: ITabularDataColumnDescription[];
}

export interface IResourceDocumentAttachmentImage extends IResourceDocumentAttachmentBase {
	type: "Image";
	mimeType: string;
	height: number;
	width: number;
}

interface IResourceDocumentAttachmentImportWizard extends IResourceDocumentAttachmentBase {
	type: "ImportWizard";

	/**
	 * Id of the device for which this preset was created
	 */
	deviceId: IDeviceId[];

	/**
	 * Display name if this ImportWizard is created as preset
	 */
	displayName?: string;
}

export interface IOptionallyTimedResourceAttachment extends IResourceDocumentAttachmentBase {
	/**
	 * When the recording of the underlying data began.
	 */
	begin?: IDatetime;

	/**
	 * When the recording of the underlying data ended.
	 */
	end?: IDatetime;
}

export interface IStrictlyTimedResourceAttachment extends IResourceDocumentAttachmentBase {
	/**
	 * When the recording of the underlying data began.
	 */
	begin: IDatetime;

	/**
	 * When the recording of the underlying data ended.
	 */
	end: IDatetime;
}

export type IResourceDocumentAttachment =
	| IResourceDocumentAttachmentRaw
	| IResourceDocumentAttachmentTabularData
	| IResourceDocumentAttachmentImage
	| IResourceDocumentAttachmentImportWizard;
