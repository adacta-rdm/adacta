import { ArchiveBoxIcon, BeakerIcon, PencilSquareIcon } from "@heroicons/react/20/solid";
import { FormDataParseError } from "@remix-run/form-data-parser";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { ReactNode } from "react";
import { data, Link, redirect } from "react-router";

import { services } from "~/app/.server/context.ts";
import { formatBatchComposition } from "~/app/lib/batchComposition.ts";
import { formatCalendarDate } from "~/app/lib/dates.ts";
import { readNoteFormData } from "~/app/lib/noteFormData.ts";
import { compareSampleNames } from "~/app/lib/sampleNames.ts";
import {
	addSubmittedSample,
	deleteSubmittedSample,
	type SampleContext,
	type SampleErrors,
} from "~/app/lib/sampleSubmission.ts";
import { NoteList } from "~/app/route-components/NoteList.tsx";
import { SampleTable } from "~/app/route-components/SampleTable.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { NoteManager, NoteNotFoundError } from "~/app/services/NoteManager.ts";
import { Security } from "~/app/services/Security.ts";
import { UploadManager } from "~/app/services/UploadManager.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";
import { parseId53 } from "~/lib/id53/parseId53.ts";
import { Logger } from "~/lib/logger/Logger.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

import type { Route } from "./+types/samples.$batchSlug._index.ts";

export async function loader({ context, params }: Route.LoaderArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const found = await findBatch(db, params.batchSlug);

	if (!found) {
		throw new Response(`Sample "${params.batchSlug}" not found.`, { status: 404 });
	}

	const { batch, archived } = found;

	// We return all samples, even archived ones. The UI needs the archived ones
	// as well. It can then suggest the next available name.
	// The assumption is that there won't be enough samples per batch to cause
	// performance issues.
	const samples = await db
		.select({
			id: Sample.id,
			name: Sample.name,
			preparedBy: { id: User.id, name: User.name },
			metadataArchivedAt: Sample.metadataArchivedAt,
		})
		.from(Sample)
		.innerJoin(User, eq(User.id, Sample.preparedById))
		.where(eq(Sample.batchId, batch.id));

	samples.sort((left, right) => compareSampleNames(left.name, right.name));

	// The page shows the notes about the batch and about each of its samples,
	// archived ones included.
	const notes = await container.get(NoteManager).aboutBatch(batch.id, {
		samples: new Map(
			samples.map((sample) => [
				sample.id,
				{ name: sample.name, archived: sample.metadataArchivedAt !== null },
			]),
		),
	});

	return {
		// An archived batch keeps its page, so a link from the archived tab
		// leads somewhere. The page then says that the batch is archived and
		// offers no way to change it.
		archived,

		batch: { ...batch, preparedBy: found.preparedBy },
		samples,
		notes,
	};
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const batch = await getBatch(db, params.batchSlug);

	if (!batch) {
		throw new Response(`Sample "${params.batchSlug}" not found.`, { status: 404 });
	}

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
		// The clicked submit button carries the operation and any target.
		// Examples:
		// { add: "", name: "#01", preparedById: "" }
		// { delete: "17" }
		let noteErrors;

		if (values.has("addNote")) {
			const subjectId = await chosenSubject(db, batch.id, values.string("about", "batch"));

			if (subjectId === undefined) {
				await pendingUpload?.discard();
				throw new Response("Note not found.", { status: 404 });
			}

			noteErrors = await notes.add(subjectId, { body: values.string("body") }, pendingUpload);
		} else if (editedNoteId !== null) {
			noteErrors = await notes.edit(
				editedNoteId,
				[batch.id, ...(await activeSampleIds(db, batch.id))],
				{ body: values.string("body") },
				pendingUpload,
				removedFileIds,
			);
		} else if (archivedNoteId !== null) {
			await notes.archive(archivedNoteId, [batch.id, ...(await activeSampleIds(db, batch.id))]);
		} else {
			const deletedSampleId = values.integer("delete", null);
			let errors: SampleErrors | undefined;

			if (deletedSampleId !== null) {
				errors = await deleteSubmittedSample(db, deletedSampleId);
			} else if (values.has("add")) {
				errors = await addSubmittedSample(sampleContext(container), batch, values);
			} else {
				errors = { form: "The sample action is not recognized." };
			}

			if (errors) return data({ errors }, { status: 400 });
		}

		if (noteErrors) {
			return data({ noteErrors }, { status: 400 });
		}

		return redirect(`/samples/${batch.slug}`, 303);
	} catch (error) {
		if (error instanceof NoteNotFoundError) {
			throw new Response("Note not found.", { status: 404 });
		}

		throw error;
	}
}

/**
 * The IDs of the samples of a batch that are not archived. A note about such
 * a sample can be added, edited, and removed. A note about an archived sample
 * is only shown.
 */
async function activeSampleIds(db: ApplicationDatabase, batchId: number): Promise<number[]> {
	const rows = await db
		.select({ id: Sample.id })
		.from(Sample)
		.where(and(eq(Sample.batchId, batchId), isNull(Sample.metadataArchivedAt)))
		.all();

	return rows.map((row) => row.id);
}

/**
 * Read the subject selected in the field `about`. For example, "batch" gives
 * the ID of the batch. "sample:17" gives 17 when sample 17 belongs to the
 * batch and is not archived. Any other value gives undefined.
 */
async function chosenSubject(
	db: ApplicationDatabase,
	batchId: number,
	about: string,
): Promise<number | undefined> {
	if (about === "batch") return batchId;

	const sampleId = about.startsWith("sample:")
		? parseId53(about.slice("sample:".length))
		: undefined;

	if (sampleId === undefined) return undefined;

	const sample = await db
		.select({ id: Sample.id })
		.from(Sample)
		.where(
			and(eq(Sample.id, sampleId), eq(Sample.batchId, batchId), isNull(Sample.metadataArchivedAt)),
		)
		.get();

	return sample?.id;
}

/**
 * The pieces app/lib needs to add a sample. They are read from the container
 * here, so the rules themselves stay free of it.
 */
function sampleContext(container: ServiceContainer): SampleContext {
	const [db, security, logger] = container.get(ApplicationDatabase, Security, Logger);

	return {
		db,
		logger,
		creatorId: security.userId,
	};
}

export default function SamplesBatchSlugIndex({ actionData, loaderData }: Route.ComponentProps) {
	const { batch, samples, notes, archived } = loaderData;
	const composition = formatBatchComposition(batch);
	const sampleErrors = actionData && "errors" in actionData ? actionData.errors : undefined;
	const noteErrors = actionData && "noteErrors" in actionData ? actionData.noteErrors : undefined;

	return (
		<div className="space-y-8">
			{archived && (
				<p className="rounded-lg border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-surface-foreground">
					<ArchiveBoxIcon className="mr-1.5 inline size-4 align-text-bottom" />
					This batch is archived. It can be read, and it cannot be changed. Restore it from the{" "}
					<Link
						to={"/samples?show=archived"}
						className="font-medium text-link underline hover:text-link-hover"
					>
						archived batches
					</Link>
					.
				</p>
			)}

			<div>
				<div className="flex items-start justify-between gap-4">
					<Heading>{batch.name}</Heading>

					{archived ? null : (
						<Link
							to={`/samples/${batch.slug}/edit`}
							className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
						>
							<PencilSquareIcon className="size-4" />
							Edit
						</Link>
					)}
				</div>

				<dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
					<Fact label="Prepared on">
						<time dateTime={batch.preparationDate}>
							{formatCalendarDate(batch.preparationDate)}
						</time>
					</Fact>

					<Fact label="Prepared by">{batch.preparedBy.name}</Fact>

					<Fact label="Composition">
						{composition ? (
							<span className="flex items-center gap-1.5">
								<BeakerIcon className="size-4 text-foreground-muted" />
								{composition}
							</span>
						) : (
							"Not recorded"
						)}
					</Fact>
				</dl>
			</div>

			<section className="overflow-hidden rounded-xl border border-border bg-surface">
				<div className="px-5 pt-5 pb-4">
					<Subheading>Samples</Subheading>
				</div>

				<SampleTable
					batch={batch}
					batchSlug={batch.slug}
					samples={samples}
					archived={archived}
					errors={sampleErrors}
				/>
			</section>

			<section className="overflow-hidden rounded-xl border border-border bg-surface">
				<div className="px-5 pt-5 pb-4">
					<Subheading>Notes</Subheading>
				</div>

				<NoteList
					notes={notes}
					pagePath={`/samples/${batch.slug}`}
					filePath={"/files/originals"}
					readOnly={archived}
					errors={noteErrors}
					aboutOptions={[
						{ value: "batch", label: "This batch" },
						...samples
							.filter((sample) => sample.metadataArchivedAt === null)
							.map((sample) => ({
								value: `sample:${sample.id}`,
								label: sample.name,
							})),
					]}
				/>
			</section>
		</div>
	);
}

/**
 * One labeled fact in the header of the page.
 */
function Fact({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div>
			<dt className="text-xs font-medium text-foreground-muted">{label}</dt>
			<dd className="mt-0.5 text-foreground">{children}</dd>
		</div>
	);
}

/**
 * The batch with this slug, archived or not. The page uses this, because an
 * archived batch is still worth reading.
 */
async function findBatch(db: ApplicationDatabase, batchSlug: string) {
	return await db
		.select({
			preparedBy: { id: User.id, name: User.name },
			archived: sql<boolean>`${SampleBatch.metadataArchivedAt} is not null`.mapWith(Boolean),
			batch: {
				id: SampleBatch.id,
				slug: SampleBatch.slug,
				name: SampleBatch.name,
				preparationDate: SampleBatch.preparationDate,
				preparedById: SampleBatch.preparedById,
				activeMaterial: SampleBatch.activeMaterial,
				support: SampleBatch.support,
			},
		})
		.from(SampleBatch)
		.innerJoin(User, eq(User.id, SampleBatch.preparedById))
		.where(eq(SampleBatch.slug, batchSlug))
		.get();
}

/**
 * The batch with this slug, only while it is active. Every form on the page
 * uses this. An archived batch is therefore treated as absent, and a submit
 * from an old page answers 404.
 */
async function getBatch(db: ApplicationDatabase, batchSlug: string) {
	// The shared add-sample helper accepts a complete batch row.
	return await db
		.select()
		.from(SampleBatch)
		.where(and(eq(SampleBatch.slug, batchSlug), isNull(SampleBatch.metadataArchivedAt)))
		.get();
}
