import { PencilSquareIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { Form, Link, useNavigation, useSearchParams } from "react-router";

import { LocalDateTime, useHasHydrated } from "~/app/components/LocalDateTime.tsx";
import { LocalDateTimeInput } from "~/app/components/LocalDateTimeInput.tsx";
import { NoteMarkdown } from "~/app/components/NoteMarkdown.tsx";
import type { CurrentNote, NoteAttachmentData, NoteErrors } from "~/app/lib/notes.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";

type DisplayNote = Omit<CurrentNote, "authorId" | "edit"> & {
	author: { id: string; name: string } | undefined;
	edit: {
		author: { id: string; name: string } | undefined;
		editedAt: Date;
	} | null;
};

/**
 * The current notes of one subject page and the forms that change them.
 *
 * A read-only subject remains visible. Its forms are left out.
 */
export function NoteList({
	notes,
	pagePath,
	filePath,
	readOnly,
	errors,
	aboutOptions,
	defaultObservedAt,
}: {
	notes: readonly DisplayNote[];
	pagePath: string;
	filePath: string;
	readOnly: boolean;
	errors?: NoteErrors | undefined;
	aboutOptions?: readonly { value: string; label: string }[] | undefined;
	defaultObservedAt?: Date | undefined;
}) {
	const [searchParams] = useSearchParams();
	const editingNoteId = noteIdOf(searchParams.get("editNote"));
	const navigation = useNavigation();
	const hasHydrated = useHasHydrated();

	// Busy until the action and the following loader have both finished. The
	// submitted form data remains available during those two steps.
	const submitted = navigation.formData;
	const isSubmitting = submitted !== undefined;
	const adding = submitted?.has("addNote") ?? false;
	const savingNoteId = noteIdOf(submitted?.get("editNote"));
	const removingNoteId = noteIdOf(submitted?.get("archiveNote"));
	const message = errors?.form ?? errors?.body ?? errors?.observedAt;
	const errorNote = notes.find((note) =>
		editingNoteId === undefined ? false : note.versionIds.includes(editingNoteId),
	);

	return (
		<div className="divide-y divide-border">
			{notes.length === 0 ? (
				<p className="px-5 py-4 text-sm text-foreground-muted">No notes yet.</p>
			) : (
				<div className="divide-y divide-border">
					{notes.map((note) => {
						const noteReadOnly = readOnly || note.sampleArchived === true;

						return (
							<article id={`note-${note.id}`} key={note.id} className="px-5 py-4">
								{editingNoteId === note.id && !noteReadOnly ? (
									<Form method="post" encType="multipart/form-data">
										<label htmlFor={`edit-note-body-${note.id}`} className="sr-only">
											Note
										</label>
										<textarea
											id={`edit-note-body-${note.id}`}
											name="body"
											required
											rows={4}
											defaultValue={note.body}
											aria-invalid={errors?.body ? true : undefined}
											aria-describedby={
												errors?.body ? `edit-note-body-error-${note.id}` : undefined
											}
											className="block w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
										/>
										<p className="mt-1.5 text-xs text-foreground-muted">Markdown is supported.</p>

										{note.attachments.length > 0 ? (
											<AttachmentList
												attachments={note.attachments}
												filePath={filePath}
												allowRemoval
											/>
										) : null}

										<div className="mt-3">
											<label
												htmlFor={`edit-note-files-${note.id}`}
												className="text-sm font-medium text-foreground"
											>
												Add files
											</label>
											<input
												id={`edit-note-files-${note.id}`}
												name="files"
												type="file"
												multiple
												className="mt-2 block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:font-semibold file:text-foreground hover:file:bg-canvas"
											/>
										</div>

										{errors?.body ? (
											<p
												id={`edit-note-body-error-${note.id}`}
												role="alert"
												className="mt-2 text-sm text-danger"
											>
												{errors.body}
											</p>
										) : null}

										{note.observedAt ? (
											<ObservedAtField
												id={`edit-note-observed-at-${note.id}`}
												value={note.observedAt}
												error={errors?.observedAt}
											/>
										) : null}

										{errors?.form ? (
											<p role="alert" className="mt-2 text-sm text-danger">
												{errors.form}
											</p>
										) : null}

										<div className="mt-3 flex items-center gap-3 text-sm">
											<button
												type="submit"
												name="editNote"
												value={note.id}
												disabled={isSubmitting}
												className="rounded-md bg-accent px-3 py-1.5 font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
											>
												{savingNoteId === note.id ? "Saving…" : "Save"}
											</button>

											<Link
												to={`${pagePath}#note-${note.id}`}
												className="text-link hover:text-link-hover"
											>
												Cancel
											</Link>
										</div>
									</Form>
								) : (
									<>
										<NoteMarkdown body={note.body} />

										{note.attachments.length > 0 ? (
											<AttachmentList attachments={note.attachments} filePath={filePath} />
										) : null}

										{message && errorNote?.id === note.id ? (
											<p role="alert" className="mt-2 text-sm text-danger">
												{message}
											</p>
										) : null}

										<div className="mt-3 space-y-0.5 text-xs text-foreground-muted">
											{note.observedAt ? (
												<p>
													Observed <LocalDateTime value={note.observedAt} />
												</p>
											) : null}

											<p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
												{note.sampleName ? (
													<span className="rounded bg-surface-muted px-1.5 py-0.5 font-medium text-foreground">
														{note.sampleName}
													</span>
												) : null}
												<span>{note.author?.name ?? "Unknown"}</span>
												{!note.observedAt ||
												!hasHydrated ||
												!sameDay(note.observedAt, note.writtenAt) ? (
													<>
														<span aria-hidden="true">·</span>
														<span>
															Written <LocalDateTime value={note.writtenAt} />
														</span>
													</>
												) : null}
											</p>

											{note.edit ? (
												<p>
													Edited by {note.edit.author?.name ?? "Unknown"} on{" "}
													<LocalDateTime value={note.edit.editedAt} />
												</p>
											) : null}
										</div>

										{noteReadOnly ? null : (
											<div className="mt-3 flex items-center gap-2">
												<Form method="get" action={pagePath}>
													<button
														type="submit"
														name="editNote"
														value={note.id}
														disabled={isSubmitting}
														className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
													>
														<PencilSquareIcon className="size-4" />
														Edit
													</button>
												</Form>

												<Form method="post">
													<button
														type="submit"
														name="archiveNote"
														value={note.id}
														disabled={isSubmitting}
														className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground-muted hover:bg-danger-surface hover:text-danger-surface-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
													>
														<TrashIcon className="size-4" />
														{removingNoteId === note.id ? "Removing…" : "Remove"}
													</button>
												</Form>
											</div>
										)}
									</>
								)}
							</article>
						);
					})}
				</div>
			)}

			{readOnly ? null : (
				<Form method="post" encType="multipart/form-data" className="px-5 py-4">
					{aboutOptions ? (
						<div className="mb-3 max-w-xs">
							<label htmlFor="add-note-about" className="text-sm font-medium text-foreground">
								About
							</label>
							<select
								id="add-note-about"
								name="about"
								defaultValue="batch"
								className="mt-2 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
							>
								{aboutOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</div>
					) : null}

					<label htmlFor="add-note-body" className="text-sm font-medium text-foreground">
						Add a note
					</label>
					<textarea
						id="add-note-body"
						name="body"
						required
						rows={4}
						aria-invalid={!errorNote && errors?.body ? true : undefined}
						aria-describedby={!errorNote && errors?.body ? "add-note-body-error" : undefined}
						className="mt-2 block w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-focus focus:outline-none"
					/>
					<p className="mt-1.5 text-xs text-foreground-muted">Markdown is supported.</p>

					<div className="mt-3">
						<label htmlFor="add-note-files" className="text-sm font-medium text-foreground">
							Attach files
						</label>
						<input
							id="add-note-files"
							name="files"
							type="file"
							multiple
							className="mt-2 block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:font-semibold file:text-foreground hover:file:bg-canvas"
						/>
					</div>

					{!errorNote && errors?.body ? (
						<p id="add-note-body-error" role="alert" className="mt-2 text-sm text-danger">
							{errors.body}
						</p>
					) : null}

					{defaultObservedAt ? (
						<ObservedAtField
							id="add-note-observed-at"
							value={defaultObservedAt}
							error={errors?.observedAt}
						/>
					) : null}

					{!errorNote && errors?.form ? (
						<p role="alert" className="mt-2 text-sm text-danger">
							{errors.form}
						</p>
					) : null}

					<button
						type="submit"
						name="addNote"
						value=""
						disabled={isSubmitting}
						className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
					>
						<PlusIcon className="size-4" />
						{adding ? "Adding…" : "Add note"}
					</button>
				</Form>
			)}
		</div>
	);
}

function AttachmentList({
	attachments,
	filePath,
	allowRemoval = false,
}: {
	attachments: readonly NoteAttachmentData[];
	filePath: string;
	allowRemoval?: boolean;
}) {
	return (
		<ul className="mt-4 space-y-3" aria-label="Attached files">
			{attachments.map((attachment) => {
				const href = `${filePath}/${attachment.id}`;
				const content = attachment.mediaType?.startsWith("image/") ? (
					<img
						src={href}
						alt={attachment.originalName}
						className="max-h-96 max-w-full rounded-lg border border-border object-contain"
					/>
				) : (
					<a href={href} className="text-sm font-medium text-link underline hover:text-link-hover">
						{attachment.originalName} ({formatFileSize(attachment.byteSize)})
					</a>
				);

				return (
					<li key={attachment.id} className="space-y-2">
						{content}
						{allowRemoval ? (
							<label className="flex w-fit items-center gap-2 text-sm text-foreground-muted">
								<input
									type="checkbox"
									name="removeAttachment"
									value={attachment.id}
									className="size-4 rounded border-border text-accent focus:ring-focus"
								/>
								Remove {attachment.originalName}
							</label>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} ${bytes === 1 ? "byte" : "bytes"}`;
	if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function ObservedAtField({ id, value, error }: { id: string; value: Date; error?: string }) {
	const errorId = `${id}-error`;

	return (
		<div className="mt-3 max-w-xs">
			<label htmlFor={id} className="text-sm font-medium text-foreground">
				Observed at
			</label>
			<LocalDateTimeInput
				id={id}
				name="observedAt"
				value={value}
				invalid={Boolean(error)}
				describedBy={error ? errorId : undefined}
			/>
			{error ? (
				<p id={errorId} role="alert" className="mt-2 text-sm text-danger">
					{error}
				</p>
			) : null}
		</div>
	);
}

function sameDay(left: Date, right: Date): boolean {
	return (
		left.getFullYear() === right.getFullYear() &&
		left.getMonth() === right.getMonth() &&
		left.getDate() === right.getDate()
	);
}

/**
 * Read a note ID from a URL parameter or a submitted form field. For example,
 * `?editNote=1234567890123` gives 1234567890123. A missing value or text that
 * is not an ID gives undefined.
 */
function noteIdOf(value: FormDataEntryValue | null | undefined): number | undefined {
	return typeof value === "string" ? parseId53(value) : undefined;
}
