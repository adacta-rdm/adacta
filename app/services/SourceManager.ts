import { and, eq, isNull } from "drizzle-orm";

import { RepoDB } from "~/app/services/RepoDB.ts";
import type { NewEntity } from "~/drizzle/Schema.ts";
import { SourceArtifact } from "~/drizzle/schema/repo.SourceArtifact.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

/**
 * Stores uploaded files and makes them available for later retrieval.
 *
 * Each file is kept exactly as it arrived and recorded as a source artifact.
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
export class SourceManager {
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
	 * Archived files are omitted. The method throws `SourceFileNotFoundError`
	 * when every file in the upload is archived or the upload id is unknown.
	 */
	artifactsOfUpload(uploadId: string) {
		const artifacts = this.database
			.select()
			.from(SourceArtifact)
			.where(and(eq(SourceArtifact.uploadId, uploadId), isNull(SourceArtifact.metadataArchivedAt)))
			.all();

		if (artifacts.length === 0) throw new SourceFileNotFoundError(uploadId);

		return artifacts;
	}

	/**
	 * Returns the record of one file and a way to read its bytes.
	 *
	 * The returned `read()` method opens a new stream each time it is called.
	 * `getArtifact()` itself does not open the stored file. An archived file
	 * is treated as absent.
	 */
	getArtifact(id: string) {
		const artifact = this.database
			.select()
			.from(SourceArtifact)
			.where(and(eq(SourceArtifact.id, id), isNull(SourceArtifact.metadataArchivedAt)))
			.get();

		if (!artifact) throw new SourceFileNotFoundError(id);

		return {
			...artifact,
			read: () => this.storage.read(artifactPath(artifact.id)),
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
	private readonly artifacts: StagedArtifact[] = [];
	private state: "open" | "failed" | "committed" = "open";

	constructor(
		private storage: StorageEngine,
		private database: RepoDB,
	) {}

	/**
	 * Stores one file in the staging area and returns its identifier.
	 *
	 * The method returns after storage has read the complete source stream. A
	 * storage failure ends the upload.
	 */
	async add(upload: ArtifactUpload): Promise<string> {
		this.assertOpen();
		const id = crypto.randomUUID();
		const path = uploadPath(this.id, id);

		try {
			await this.storage.write(path, upload.source);
			this.artifacts.push({
				id,
				originalName: upload.originalName,
				mediaType: upload.mediaType ?? null,
				byteSize: await this.storage.size(path),
			});
			return id;
		} catch (error) {
			// The garbage collector removes files that remain in the staging
			// area. No source artifact record refers to them.
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
		if (this.artifacts.length === 0) throw new Error("An upload requires a file.");

		const movedArtifacts: StagedArtifact[] = [];
		try {
			for (const artifact of this.artifacts) {
				await this.storage.rename(uploadPath(this.id, artifact.id), artifactPath(artifact.id));
				movedArtifacts.push(artifact);
			}

			const createdAt = new Date();
			const artifacts = this.artifacts.map((artifact) => ({
				...artifact,
				uploadId: this.id,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			})) satisfies NewEntity<"SourceArtifact">[];

			this.database.transaction((transaction) => {
				transaction.insert(SourceArtifact).values(artifacts).run();
			});

			this.state = "committed";
			return this.id;
		} catch (error) {
			this.state = "failed";
			for (const artifact of movedArtifacts) {
				await this.storage.remove(artifactPath(artifact.id));
			}
			throw error;
		}
	}

	private assertOpen(): void {
		if (this.state === "failed") throw new Error("The upload has failed.");
		if (this.state === "committed") throw new Error("The upload is complete.");
	}
}

type StagedArtifact = {
	id: string;
	originalName: string;
	mediaType: string | null;
	byteSize: number;
};

type ArtifactUpload = {
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

function uploadPath(uploadId: string, artifactId: string): string {
	return `uploads/${uploadId}/${artifactId}`;
}

function artifactPath(artifactId: string): string {
	return `source-artifacts/${artifactId}`;
}

/**
 * Reports that no available source file matched an identifier.
 */
export class SourceFileNotFoundError extends Error {
	constructor(id: string) {
		super(`Source file record not found: ${id}`);
		this.name = "SourceFileNotFoundError";
	}
}
