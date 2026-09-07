import { and, eq, isNull } from "drizzle-orm";

import { RepoDB } from "~/app/services/RepoDB.ts";
import type { NewEntity } from "~/drizzle/Schema.ts";
import { SourceArtifact } from "~/drizzle/schema/repo.SourceArtifact.ts";
import { SourceBundle } from "~/drizzle/schema/repo.SourceBundle.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";
import { StorageEngine } from "~/lib/storage-engine/StorageEngine.ts";

/**
 * Stores uploaded files and makes their metadata and original bytes available
 * for retrieval. It preserves each file as a source artifact and records each
 * upload session as a source bundle.
 *
 * A source bundle may contain one file, or related files such as a measurement and
 * its sidecar.
 *
 * New files are staged before the bundle is recorded. A bundle becomes
 * available through this manager only after every file has been stored and the
 * upload has been committed.
 */
@Service(StorageEngine, RepoDB)
export class SourceManager {
	constructor(
		private storage: StorageEngine,
		private database: RepoDB,
	) {}

	/**
	 * Starts one upload session that can be finalized as a source bundle.
	 *
	 * Files may be added until the session is committed or an operation fails.
	 * The returned session cannot be reused after either event.
	 */
	beginBundle(): PendingSourceBundle {
		return new PendingSourceBundle(this.storage, this.database);
	}

	/**
	 * Returns one published source bundle and the metadata of all its artifacts.
	 *
	 * An archived bundle is treated as absent. Archived artifacts are omitted. The
	 * method throws `SourceFileNotFoundError` when the bundle is absent.
	 */
	getBundle(id: string) {
		const bundle = this.database
			.select()
			.from(SourceBundle)
			.where(and(eq(SourceBundle.id, id), isNull(SourceBundle.metadataArchivedAt)))
			.get();
		if (!bundle) throw new SourceFileNotFoundError(id);

		const artifacts = this.database
			.select()
			.from(SourceArtifact)
			.where(and(eq(SourceArtifact.sourceBundleId, id), isNull(SourceArtifact.metadataArchivedAt)))
			.all();

		return { ...bundle, artifacts };
	}

	/**
	 * Returns metadata and read access for one published source artifact.
	 *
	 * The returned `read()` method opens a new stream of the original bytes. The
	 * stored file is not opened by `getArtifact()`. An archived artifact or an
	 * artifact in an archived bundle is treated as absent.
	 */
	getArtifact(id: string) {
		const result = this.database
			.select({ artifact: SourceArtifact })
			.from(SourceArtifact)
			.innerJoin(SourceBundle, eq(SourceArtifact.sourceBundleId, SourceBundle.id))
			.where(
				and(
					eq(SourceArtifact.id, id),
					isNull(SourceBundle.metadataArchivedAt),
					isNull(SourceArtifact.metadataArchivedAt),
				),
			)
			.get();

		if (!result) throw new SourceFileNotFoundError(id);

		return {
			...result.artifact,
			read: () => this.storage.read(artifactPath(result.artifact.id)),
		};
	}
}

/**
 * Collects the files from one upload session and publishes them as one bundle.
 *
 * Files can be added until the session is committed. A failed or committed
 * session rejects every later operation.
 */
class PendingSourceBundle {
	/**
	 * The identifier used for the source bundle if the upload is committed.
	 */
	readonly id = crypto.randomUUID();
	private readonly artifacts: StagedArtifact[] = [];
	private state: "open" | "failed" | "committed" = "open";

	constructor(
		private storage: StorageEngine,
		private database: RepoDB,
	) {}

	/**
	 * Stages one original file and returns its artifact identifier.
	 *
	 * The method consumes the source stream before it resolves. A storage failure
	 * marks the upload session as failed.
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
			// Failed uploads remain below uploads/ for the garbage collector. They
			// are never referenced by a source artifact record.
			this.state = "failed";
			throw error;
		}
	}

	/**
	 * Publishes all staged files and returns the source bundle identifier.
	 *
	 * At least one file must have been added. The method moves every file to its
	 * permanent location before it records the bundle and its artifacts in one
	 * database transaction.
	 */
	async commit(creatorId: string): Promise<string> {
		this.assertOpen();
		if (this.artifacts.length === 0) throw new Error("A source bundle requires an artifact.");

		const movedArtifacts: StagedArtifact[] = [];
		try {
			for (const artifact of this.artifacts) {
				await this.storage.rename(uploadPath(this.id, artifact.id), artifactPath(artifact.id));
				movedArtifacts.push(artifact);
			}

			const createdAt = new Date();
			const bundle = {
				id: this.id,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			} satisfies NewEntity<"SourceBundle">;
			const artifacts = this.artifacts.map((artifact) => ({
				...artifact,
				sourceBundleId: this.id,
				metadataCreatorId: creatorId,
				metadataCreationTimestamp: createdAt,
			})) satisfies NewEntity<"SourceArtifact">[];

			this.database.transaction((transaction) => {
				transaction.insert(SourceBundle).values(bundle).run();
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
		if (this.state === "failed") throw new Error("The source bundle upload has failed.");
		if (this.state === "committed") throw new Error("The source bundle upload is complete.");
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

function uploadPath(bundleId: string, artifactId: string): string {
	return `uploads/${bundleId}/${artifactId}`;
}

function artifactPath(artifactId: string): string {
	return `source-artifacts/${artifactId}`;
}

/**
 * Reports that a published source bundle or artifact does not exist.
 */
export class SourceFileNotFoundError extends Error {
	constructor(id: string) {
		super(`Source file record not found: ${id}`);
		this.name = "SourceFileNotFoundError";
	}
}
