/**
 * Pure note types and the rules that select current versions for display.
 */
import type { Entity } from "~/drizzle/Schema.ts";

export type NoteErrors = Partial<Record<"form" | "body" | "observedAt", string>>;

export interface CurrentNote {
	id: number;
	versionIds: number[];
	body: string;
	authorId: string;
	writtenAt: Date;
	edit: {
		authorId: string;
		editedAt: Date;
	} | null;
	observedAt?: Date | undefined;
	sampleName?: string | undefined;
	sampleArchived?: boolean | undefined;
	attachments: NoteAttachmentData[];
}

export interface NoteAttachmentData {
	id: number;
	originalName: string;
	mediaType: string | null;
	byteSize: number;
	position: number;
}

export interface CurrentNotesOptions {
	/**
	 * The samples among the subjects, by ID. For example, on a batch page, a
	 * note about sample #01 shows "#01".
	 */
	samples?: Map<number, { name: string; archived: boolean }>;

	/**
	 * The time the notes are sorted by. "written" is the time the first
	 * version was written. "observed" is the observed time of the current
	 * version. The default is "written".
	 */
	order?: "written" | "observed";

	/**
	 * The files attached to each note version, by the ID of the version.
	 */
	attachments?: Map<number, NoteAttachmentData[]>;
}

/**
 * Build one display row for every note chain that remains visible.
 */
export function currentNotes(
	rows: Entity<"Note">[],
	options: CurrentNotesOptions = {},
): CurrentNote[] {
	const byId = new Map(rows.map((row) => [row.id, row]));
	const supersededIds = new Set(
		rows.flatMap((row) => (row.supersedesId === null ? [] : [row.supersedesId])),
	);

	return rows
		.filter((row) => !supersededIds.has(row.id) && row.metadataArchivedAt === null)
		.map((current): CurrentNote => {
			let first = current;
			const versionIds = [current.id];

			while (first.supersedesId !== null) {
				const previous = byId.get(first.supersedesId);
				if (!previous) break;
				first = previous;
				versionIds.push(first.id);
			}

			const result: CurrentNote = {
				id: current.id,
				versionIds,
				body: current.body,
				authorId: first.metadataCreatorId,
				writtenAt: first.metadataCreationTimestamp,
				attachments: options.attachments?.get(current.id) ?? [],
				edit:
					current.id === first.id
						? null
						: {
								authorId: current.metadataCreatorId,
								editedAt: current.metadataCreationTimestamp,
							},
			};

			// Only a rig note records an observed time.
			if (current.observedAt !== null) {
				result.observedAt = current.observedAt;
			}

			const sample = options.samples?.get(current.noteSubjectId);

			if (sample) {
				result.sampleName = sample.name;
				result.sampleArchived = sample.archived;
			}

			return result;
		})
		.sort((left, right) => {
			const leftTime =
				options.order === "observed" ? (left.observedAt?.getTime() ?? 0) : left.writtenAt.getTime();
			const rightTime =
				options.order === "observed"
					? (right.observedAt?.getTime() ?? 0)
					: right.writtenAt.getTime();

			return leftTime - rightTime || left.id - right.id;
		});
}

/**
 * Replace the author IDs of each note with the users. For example, the author
 * ID "u1" becomes `{ id: "u1", name: "Ada" }`. An ID that is not in `users`
 * becomes undefined.
 */
export function resolveNoteAuthors(
	notes: CurrentNote[],
	users: Map<string, { id: string; name: string }>,
) {
	return notes.map(({ authorId, edit, ...note }) => ({
		...note,
		author: users.get(authorId),
		edit: edit
			? {
					author: users.get(edit.authorId),
					editedAt: edit.editedAt,
				}
			: null,
	}));
}

/**
 * Add the recovery instruction when a refused note carried files. For example,
 * "A note cannot be empty." becomes "A note cannot be empty. Attach the files
 * again." The staged files of a refused note are discarded. Hence, the user
 * attaches them again.
 */
export function noteErrorsWithFileRetry(errors: NoteErrors, hadFiles: boolean): NoteErrors {
	if (!hadFiles) return errors;

	for (const key of ["form", "body", "observedAt"] as const) {
		if (errors[key]) return { ...errors, [key]: `${errors[key]} Attach the files again.` };
	}

	return errors;
}
