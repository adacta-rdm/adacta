import { and, eq, isNull } from "drizzle-orm";

import { RepoDB } from "~/app/services/RepoDB.ts";
import type { NewEntity } from "~/drizzle/Schema.ts";
import { OriginalFile } from "~/drizzle/schema/repo.OriginalFile.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

/**
 * Stores uploaded files and makes them available for later retrieval.
 *
 * Each file is kept exactly as it arrived and recorded as an original file.
 * Files remain in a staging area until every file in the upload has been
 * stored. They are then moved to permanent storage and recorded together. A
 * file can therefore be retrieved only after the complete upload succeeds.
 *
 * Files submitted in the same upload share an upload id. For example, a table
 * of measurements and its sidecar file may share an upload id. The shared id
 * records only how the files arrived. Any relationship between the files is
 * recorded separately during import.
 */
@Service(StorageEngine, RepoDB)
export class UploadManager {
	constructor(
		private storage: StorageEngine,
		private database: RepoDB,
	) {}

	/**
	 * Starts one upload and returns the object used to add its files.
	 *
	 * Files may be added until the upload is committed. A successful commit or
	 * any failure closes the upload. Further calls then fail.
	 */
	beginUpload(): PendingUpload {
		return new PendingUpload(this.storage, this.database);
	}

	/**
	 * Returns the files of one upload, in the order they arrived.
	 *
	 * Archived files are omitted. The method throws `UploadNotFoundError`
	 * when every file in the upload is archived or the upload id is unknown.
	 */
	async filesOfUpload(uploadId: string) {
		const files = await this.database
			.select()
			.from(OriginalFile)
			.where(and(eq(OriginalFile.uploadId, uploadId), isNull(OriginalFile.metadataArchivedAt)))
			.all();

		if (files.length === 0) throw new UploadNotFoundError(uploadId);

		return files;
	}

	/**
	 * Returns the record of one file and a way to read its bytes.
	 *
	 * The returned `read()` method opens a new stream each time it is called.
	 * `getFile()` itself does not open the stored file. An archived file
	 * is treated as absent.
	 */
	async getFile(id: string) {
		const file = await this.database
			.select()
			.from(OriginalFile)
			.where(and(eq(OriginalFile.id, id), isNull(OriginalFile.metadataArchivedAt)))
			.get();

		if (!file) throw new OriginalFileNotFoundError(id);

		return {
			...file,
			read: () => this.storage.read(originalFilePath(file.id)),
		};
	}
}

/**
 * Collects the files of one upload and records them together.
 */
class PendingUpload {
	/**
	 * Every file record created by this upload uses this identifier. The staging
	 * directory is also named after it. For example, a file is staged at
	 * `uploads/<upload id>/<file id>`.
	 */
	readonly id = crypto.randomUUID();
	private readonly files: StagedFile[] = [];
	private state: "open" | "failed" | "committed" = "open";

	constructor(
		private storage: StorageEngine,
		private database: RepoDB,
	) {}

	/**
	 * Stores one file in the staging area and returns its identifier.
	 *
	 * The method returns after storage has read the complete file stream. A
	 * storage failure ends the upload.
	 */
	async add(upload: FileUpload): Promise<string> {
		this.assertOpen();
		const id = crypto.randomUUID();
		const path = uploadPath(this.id, id);

		try {
			await this.storage.write(path, upload.source);
			this.files.push({
				id,
				originalName: upload.originalName,
				mediaType: upload.mediaType ?? null,
				byteSize: await this.storage.size(path),
			});
			return id;
		} catch (error) {
			// The garbage collector removes files that remain in the staging
			// area. No original file record refers to them.
			this.state = "failed";
			throw error;
		}
	}

	/**
	 * Records every staged file and returns the upload identifier.
	 *
	 * At least one file must have been added. The method first moves every
	 * file to its permanent location. It then writes all the records in one
	 * database transaction. A recorded file is therefore always present in
	 * storage.
	 */
	async commit(creatorId: string): Promise<string> {
		this.assertOpen();
		if (this.files.length === 0) throw new Error("An upload requires a file.");

		const movedFiles: StagedFile[] = [];
		try {
			for (const file of this.files) {
				await this.storage.rename(uploadPath(this.id, file.id), originalFilePath(file.id));
				movedFiles.push(file);
			}

			const createdAt = new Date();
			const files = this.files.map((file) => ({
				...file,
				uploadId: this.id,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			})) satisfies NewEntity<"OriginalFile">[];

			// One INSERT statement records the complete upload atomically. Await it
			// before publishing the upload identifier.
			await this.database.insert(OriginalFile).values(files).run();

			this.state = "committed";
			return this.id;
		} catch (error) {
			this.state = "failed";
			for (const file of movedFiles) {
				await this.storage.remove(originalFilePath(file.id));
			}
			throw error;
		}
	}

	private assertOpen(): void {
		if (this.state === "failed") throw new Error("The upload has failed.");
		if (this.state === "committed") throw new Error("The upload is complete.");
	}
}

type StagedFile = {
	id: string;
	originalName: string;
	mediaType: string | null;
	byteSize: number;
};

type FileUpload = {
	/**
	 * The name supplied by the user's file system.
	 */
	originalName: string;

	/**
	 * The media type supplied with the upload, if known.
	 */
	mediaType?: string | null;

	/**
	 * The original file bytes.
	 */
	source: ReadableStream<Uint8Array>;
};

function uploadPath(uploadId: string, fileId: string): string {
	return `uploads/${uploadId}/${fileId}`;
}

function originalFilePath(fileId: string): string {
	return `original-files/${fileId}`;
}

/**
 * Reports that an upload has no available files.
 */
export class UploadNotFoundError extends Error {
	constructor(uploadId: string) {
		super(`Upload not found: ${uploadId}`);
		this.name = "UploadNotFoundError";
	}
}

/**
 * Reports that no available original file matched an identifier.
 */
export class OriginalFileNotFoundError extends Error {
	constructor(id: string) {
		super(`Original file record not found: ${id}`);
		this.name = "OriginalFileNotFoundError";
	}
}
