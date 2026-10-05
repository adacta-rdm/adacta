import { FormDataParseError } from "@remix-run/form-data-parser";
import { and, eq, isNull } from "drizzle-orm";
import { data, redirect } from "react-router";

import { services } from "~/app/.server/context.ts";
import { parseZonedDateTime } from "~/app/lib/dates.ts";
import { readNoteFormData } from "~/app/lib/noteFormData.ts";
import { noteErrorsWithFileRetry, resolveNoteAuthors } from "~/app/lib/notes.ts";
import { NoteList } from "~/app/route-components/NoteList.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { NoteManager, NoteNotFoundError } from "~/app/services/NoteManager.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { UserManager } from "~/app/services/UserManager.ts";
import { Subheading } from "~/catalyst-ui/heading.tsx";
import { InventoryEntry } from "~/drizzle/schema/InventoryEntry.ts";

import type { Route } from "./+types/inventory.$entrySlug.notes.ts";

export async function loader({ context, params }: Route.LoaderArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const rig = await getRig(db, params.entrySlug);

	if (!rig) throw new Response(`Rig "${params.entrySlug}" not found.`, { status: 404 });

	const users = new Map((await container.get(UserManager).users()).map((user) => [user.id, user]));
	const notes = resolveNoteAuthors(
		await container.get(NoteManager).about([rig.id], { order: "observed" }),
		users,
	);

	return { notes, defaultObservedAt: new Date() };
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const rig = await getRig(db, params.entrySlug);

	if (!rig) throw new Response(`Rig "${params.entrySlug}" not found.`, { status: 404 });

	let submitted: Awaited<ReturnType<typeof readNoteFormData>>;

	try {
		submitted = await readNoteFormData(request, container.get(UploadManager));
	} catch (error) {
		if (error instanceof FormDataParseError) {
			return data({ noteErrors: { form: "The note form could not be read." } }, { status: 400 });
		}
		if (error instanceof NoteNotFoundError) {
			throw new Response("Note not found.", { status: 404 });
		}
		throw error;
	}

	const { values, editedNoteId, archivedNoteId, pendingUpload, removedFileIds } = submitted;
	const notes = container.get(NoteManager);

	try {
		let noteErrors;

		if (values.has("addNote") || editedNoteId !== null) {
			// Every rig note records when the described event happened.
			const observedAt = parseZonedDateTime(values.string("observedAt", ""));

			if (!observedAt) {
				await pendingUpload?.discard();
				noteErrors = noteErrorsWithFileRetry(
					{ observedAt: "Enter a valid observed time." },
					pendingUpload !== undefined,
				);
			} else if (values.has("addNote")) {
				noteErrors = await notes.add(
					rig.id,
					{ body: values.string("body"), observedAt },
					pendingUpload,
				);
			} else if (editedNoteId !== null) {
				noteErrors = await notes.edit(
					editedNoteId,
					[rig.id],
					{ body: values.string("body"), observedAt },
					pendingUpload,
					removedFileIds,
				);
			}
		} else if (archivedNoteId !== null) {
			await notes.archive(archivedNoteId, [rig.id]);
		} else {
			noteErrors = { form: "The note action is not recognized." };
		}

		if (noteErrors) {
			return data({ noteErrors }, { status: 400 });
		}

		return redirect(`/inventory/${params.entrySlug}/notes`, 303);
	} catch (error) {
		if (error instanceof NoteNotFoundError) {
			throw new Response("Note not found.", { status: 404 });
		}

		throw error;
	}
}

export default function InventoryEntrySlugNotes({
	loaderData,
	actionData,
	params,
}: Route.ComponentProps) {
	return (
		<section className="overflow-hidden rounded-xl border border-border bg-surface">
			<div className="px-5 pt-5 pb-4">
				<Subheading>Notes</Subheading>
			</div>

			<NoteList
				notes={loaderData.notes}
				pagePath={`/inventory/${params.entrySlug}/notes`}
				filePath={"/files/originals"}
				readOnly={false}
				errors={actionData?.noteErrors}
				defaultObservedAt={loaderData.defaultObservedAt}
			/>
		</section>
	);
}

function getRig(db: ApplicationDatabase, slug: string) {
	return db
		.select()
		.from(InventoryEntry)
		.where(
			and(
				eq(InventoryEntry.slug, slug),
				eq(InventoryEntry.kind, "rig"),
				isNull(InventoryEntry.metadataArchivedAt),
			),
		)
		.get();
}
