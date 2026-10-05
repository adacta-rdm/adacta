import { parseFormData } from "@remix-run/form-data-parser";

import { NoteNotFoundError } from "~/app/services/NoteManager.ts";
import { UploadManager, type PendingUpload } from "~/app/services/UploadManager.ts";
import { FormValues } from "~/lib/form-values/FormValues.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";

/**
 * Read a note form and stage any uploaded files.
 *
 * The submit buttons `editNote` and `archiveNote` carry a note ID. For
 * example, `editNote=1234567890123` gives `editedNoteId` 1234567890123. An
 * absent button gives null.
 *
 * @throws NoteNotFoundError when a note ID is not a valid ID. An unknown ID
 *   gets the same answer later. The staged files are discarded first.
 */
export async function readNoteFormData(
	request: Request,
	sources: UploadManager,
): Promise<{
	values: FormValues;
	editedNoteId: number | null;
	archivedNoteId: number | null;
	removedFileIds: number[];
	pendingUpload: PendingUpload | undefined;
}> {
	let pendingUpload: PendingUpload | undefined;
	const contentType = request.headers.get("Content-Type") ?? "";
	let formData: FormData;

	try {
		formData = contentType.startsWith("multipart/form-data")
			? await parseFormData(request, { maxFileSize: Number.POSITIVE_INFINITY }, async (upload) => {
					if (upload.fieldName !== "files" || upload.name === "") return;

					pendingUpload ??= sources.beginUpload();
					const fileId = await pendingUpload.add({
						originalName: upload.name,
						mediaType: upload.type,
						source: upload.stream(),
					});

					// Form data holds only text and files. The handler therefore returns
					// the ID as text.
					return String(fileId);
				})
			: await request.formData();
	} catch (error) {
		await pendingUpload?.discard();
		throw error;
	}

	const values = new FormValues(formData);
	const editedNoteId = noteIdField(values, "editNote");
	const archivedNoteId = noteIdField(values, "archiveNote");

	if (editedNoteId === undefined || archivedNoteId === undefined) {
		await pendingUpload?.discard();
		throw new NoteNotFoundError();
	}

	return {
		values,
		editedNoteId,
		archivedNoteId,
		pendingUpload,
		// An edit ignores a file ID that the note does not have. A value that is
		// not an ID is therefore left out.
		removedFileIds: formData.getAll("removeAttachment").flatMap((value) => {
			const id = typeof value === "string" ? parseId53(value) : undefined;
			return id === undefined ? [] : [id];
		}),
	};
}

/**
 * Read the note ID of one submit button. An absent button gives null. Text
 * that is not an ID gives undefined.
 */
function noteIdField(values: FormValues, name: string): number | null | undefined {
	const text = values.string(name, null);

	return text === null ? null : parseId53(text);
}
