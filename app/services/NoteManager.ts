/**
 * Adds, edits, archives, and reads notes.
 *
 * Each note names its subject by its row in Id. For example, a note about
 * sample #01 stores the ID of that sample. A caller passes the subject IDs it
 * shows. For example, a batch page passes the ID of the batch and the IDs of
 * its samples. A note whose subject is not among them is treated as absent.
 *
 * An edit creates a row that names the version it replaces. An archive marks
 * the current row. Existing text and attachments therefore remain unchanged.
 */
import { type SQL, and, asc, eq, getColumns, inArray, isNull, notExists, or } from "drizzle-orm";

import {
	currentNotes,
	noteErrorsWithFileRetry,
	type CurrentNote,
	type CurrentNotesOptions,
	type NoteAttachmentData,
	type NoteErrors,
} from "~/app/lib/notes.ts";
import { type BatchStatement, ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { type PendingUpload, UploadManager } from "~/app/services/UploadManager.ts";
import type { Entity } from "~/drizzle/Schema.ts";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Note } from "~/drizzle/schema/Note.ts";
import { NoteAttachment } from "~/drizzle/schema/NoteAttachment.ts";
import { OriginalFile } from "~/drizzle/schema/OriginalFile.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { id53 } from "~/lib/id53/id53.ts";
import { Service } from "~/lib/service-container/ServiceContainer.ts";
import { UniqueConstraintViolationError } from "~/lib/sqlite-errors/UniqueConstraintViolationError.ts";

export interface NoteInput {
	body: string;

	/**
	 * The moment the note describes. An edit without it keeps the time of the
	 * version it replaces.
	 */
	observedAt?: Date;
}

@Service(ApplicationDatabase, UploadManager, Security)
export class NoteManager {
	constructor(
		private db: ApplicationDatabase,
		private sources: UploadManager,
		private security: Security,
	) {}

	/**
	 * Return the current notes about the given subjects, with their authors.
	 */
	async about(
		subjectIds: readonly number[],
		options: Omit<CurrentNotesOptions, "attachments"> = {},
	): Promise<CurrentNote[]> {
		if (subjectIds.length === 0) return [];

		return this.currentNotesWhere(inArray(Note.noteSubjectId, [...subjectIds]), options);
	}

	/**
	 * Return the current notes about a batch and about each of its samples.
	 */
	async aboutBatch(
		batchId: number,
		options: Omit<CurrentNotesOptions, "attachments"> = {},
	): Promise<CurrentNote[]> {
		const sampleIds = this.db
			.select({ id: Sample.id })
			.from(Sample)
			.where(eq(Sample.batchId, batchId));

		return this.currentNotesWhere(
			or(eq(Note.noteSubjectId, batchId), inArray(Note.noteSubjectId, sampleIds))!,
			options,
		);
	}

	/**
	 * Return the current versions of the notes that match the condition, with
	 * their files.
	 */
	private async currentNotesWhere(
		condition: SQL,
		options: Omit<CurrentNotesOptions, "attachments">,
	): Promise<CurrentNote[]> {
		// Each version carries its author, so the first and latest versions retain
		// their names when currentNotes follows the chain of edits.
		const rows = await this.db
			.select({ ...getColumns(Note), author: { id: User.id, name: User.name } })
			.from(Note)
			.innerJoin(User, eq(User.id, Note.metadataCreatorId))
			.where(condition)
			.all();

		return currentNotes(rows, {
			...options,
			attachments: await this.attachmentsOfNotesWhere(condition),
		});
	}

	/**
	 * Add one note about one subject. Invalid values return messages for the
	 * form.
	 */
	async add(
		subjectId: number,
		input: NoteInput,
		upload?: PendingUpload,
	): Promise<NoteErrors | undefined> {
		let pendingUpload = upload;
		const hadFiles = pendingUpload !== undefined;

		try {
			const body = input.body.trim();
			if (!body) return noteErrorsWithFileRetry({ body: "A note cannot be empty." }, hadFiles);

			const fileIds = await this.commitUpload(pendingUpload);
			pendingUpload = undefined;
			const noteId = id53();

			const statements: BatchStatement[] = [
				this.db.insert(Note).values({
					id: noteId,
					noteSubjectId: subjectId,
					body,
					observedAt: input.observedAt ?? null,
					supersedesId: null,
					metadataCreatorId: this.security.userId,
					metadataCreationTimestamp: new Date(),
				}),
			];

			// Separate inserts avoid a large parameter list per statement.
			statements.push(
				...fileIds.map((originalFileId, position) =>
					this.db.insert(NoteAttachment).values({ noteId, originalFileId, position }),
				),
			);

			await this.db.batch(statements);

			return undefined;
		} finally {
			await pendingUpload?.discard();
		}
	}

	/**
	 * Replace the current version with another row. The note must be about one
	 * of the given subjects. Invalid values return messages for the form.
	 *
	 * @throws NoteNotFoundError when the note is not a current version about
	 *   one of the subjects.
	 */
	async edit(
		noteId: number,
		subjectIds: readonly number[],
		input: NoteInput,
		upload?: PendingUpload,
		removedFileIds: readonly number[] = [],
	): Promise<NoteErrors | undefined> {
		let pendingUpload = upload;
		const hadFiles = pendingUpload !== undefined;

		try {
			const body = input.body.trim();
			if (!body) return noteErrorsWithFileRetry({ body: "A note cannot be empty." }, hadFiles);

			const current = await this.currentNote(noteId, subjectIds);
			const fileIds = await this.commitUpload(pendingUpload);
			pendingUpload = undefined;
			const removed = new Set(removedFileIds);
			const attachments = await this.db
				.select({ originalFileId: NoteAttachment.originalFileId })
				.from(NoteAttachment)
				.where(eq(NoteAttachment.noteId, current.id))
				.orderBy(asc(NoteAttachment.position))
				.all();
			const attachmentFileIds = attachments
				.map((attachment) => attachment.originalFileId)
				.filter((originalFileId) => !removed.has(originalFileId))
				.concat(fileIds);
			const newNoteId = id53();
			const statements: BatchStatement[] = [
				this.db.insert(Note).values({
					id: newNoteId,
					noteSubjectId: current.noteSubjectId,
					body,
					observedAt: input.observedAt ?? current.observedAt,
					supersedesId: current.id,
					metadataCreatorId: this.security.userId,
					metadataCreationTimestamp: new Date(),
				}),
			];

			// Separate inserts avoid a large parameter list per statement.
			statements.push(
				...attachmentFileIds.map((originalFileId, position) =>
					this.db.insert(NoteAttachment).values({ noteId: newNoteId, originalFileId, position }),
				),
			);

			try {
				await this.db.batch(statements);
			} catch (error) {
				// Another edit of the same version wrote its row first.
				if (error instanceof UniqueConstraintViolationError && error.isOn([Note.supersedesId])) {
					return noteErrorsWithFileRetry(
						{
							form: "Someone else changed this note. Reload the page to see the latest text.",
						},
						hadFiles,
					);
				}

				throw error;
			}

			return undefined;
		} finally {
			await pendingUpload?.discard();
		}
	}

	/**
	 * Archive the current version of a note. The note must be about one of the
	 * given subjects.
	 *
	 * @throws NoteNotFoundError when the note is not a current version about
	 *   one of the subjects.
	 */
	async archive(noteId: number, subjectIds: readonly number[]): Promise<void> {
		const current = await this.currentNote(noteId, subjectIds);

		// The statement runs as a batch, because only a batch reports the number
		// of changed rows.
		const [archived] = await this.db.batch([
			this.db
				.update(Note)
				.set({ metadataArchivedAt: new Date() })
				.where(
					and(
						eq(Note.id, current.id),
						isNull(Note.metadataArchivedAt),
						notExists(
							this.db.select({ id: Note.id }).from(Note).where(eq(Note.supersedesId, current.id)),
						),
					),
				),
		]);

		if (archived!.changes === 0) throw new NoteNotFoundError();
	}

	/**
	 * Load the files of the note versions that match the condition and group
	 * them by version.
	 */
	private async attachmentsOfNotesWhere(
		condition: SQL,
	): Promise<Map<number, NoteAttachmentData[]>> {
		const noteIds = this.db.select({ id: Note.id }).from(Note).where(condition);

		const rows = await this.db
			.select({
				noteId: NoteAttachment.noteId,
				id: OriginalFile.id,
				originalName: OriginalFile.originalName,
				mediaType: OriginalFile.mediaType,
				byteSize: OriginalFile.byteSize,
				position: NoteAttachment.position,
			})
			.from(NoteAttachment)
			.innerJoin(OriginalFile, eq(NoteAttachment.originalFileId, OriginalFile.id))
			.where(inArray(NoteAttachment.noteId, noteIds))
			.orderBy(asc(NoteAttachment.position))
			.all();
		const byNote = new Map<number, NoteAttachmentData[]>();

		for (const row of rows) {
			const { noteId, ...attachment } = row;
			const attachments = byNote.get(noteId) ?? [];
			attachments.push(attachment);
			byNote.set(noteId, attachments);
		}

		return byNote;
	}

	/**
	 * Commit one staged upload and return its file ids in arrival order.
	 */
	private async commitUpload(upload: PendingUpload | undefined): Promise<number[]> {
		if (!upload) return [];

		const uploadId = await upload.commit(this.security.userId);

		return (await this.sources.filesOfUpload(uploadId)).map((file) => file.id);
	}

	/**
	 * Return the active current version of a note about one of the subjects.
	 */
	private async currentNote(
		noteId: number,
		subjectIds: readonly number[],
	): Promise<Entity<"Note">> {
		const note = await this.db
			.select()
			.from(Note)
			.where(and(eq(Note.id, noteId), isNull(Note.metadataArchivedAt)))
			.get();

		const successor = note
			? await this.db.select({ id: Note.id }).from(Note).where(eq(Note.supersedesId, note.id)).get()
			: undefined;

		if (!note || !subjectIds.includes(note.noteSubjectId) || successor) {
			throw new NoteNotFoundError();
		}

		return note;
	}
}

/**
 * A note is not a current version about the given subjects. For example, the
 * note was edited since, or it is about another batch.
 */
export class NoteNotFoundError extends Error {
	constructor() {
		super("Note not found.");
		this.name = "NoteNotFoundError";
	}
}
