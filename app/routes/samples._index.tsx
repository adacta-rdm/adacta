/**
 * Every sample batch.
 *
 * The most recently prepared batch comes first, because a laboratory usually
 * works on what it just made. Batches prepared on the same day are ordered by
 * name.
 *
 * A batch is archived rather than deleted. Its samples point at it, and its
 * preparation is a record of work that was done. Archiving takes it out of
 * the workflow and leaves both intact.
 *
 * The page has two tabs. "Active" is the workflow and is what opens by
 * default. "Archived" holds what has been put aside, and a batch can be
 * restored from there. Each tab is its own address, so a link to either one
 * opens on the right tab.
 */
import {
	ArchiveBoxArrowDownIcon,
	ArrowUturnLeftIcon,
	ChevronRightIcon,
	PlusIcon,
} from "@heroicons/react/20/solid";
import { and, count, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { Fragment } from "react";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { ListPanel, ListEmpty, ListView } from "~/app/components/ListPanel.tsx";
import { ListTable, ListTableHead } from "~/app/components/ListTable.tsx";
import { formatBatchComposition } from "~/app/lib/batchComposition.ts";
import { formatCalendarDate } from "~/app/lib/dates.ts";
import { compareSampleNames } from "~/app/lib/sampleNames.ts";
import {
	addSubmittedSample,
	deleteSubmittedSample,
	type SampleErrors,
} from "~/app/lib/sampleSubmission.ts";
import { ListFilter } from "~/app/route-components/ListFilter.tsx";
import { SampleRows } from "~/app/route-components/SampleTable.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { Security } from "~/app/services/Security.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { User } from "~/drizzle/schema/BetterAuth.ts";
import { Sample } from "~/drizzle/schema/Sample.ts";
import { SampleBatch } from "~/drizzle/schema/SampleBatch.ts";
import { FormValues } from "~/lib/form-values/FormValues.ts";
import { Logger } from "~/lib/logger/Logger.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

import type { Route } from "./+types/samples._index.ts";

/**
 * The address of the archived tab, for example /samples?show=archived.
 */
const TAB_PARAM = "show";
const ARCHIVED_TAB = "archived";

/**
 * The address of the open row, for example /samples?open=pt-al2o3. The
 * row of that batch shows its samples. Only that batch is read, so a list of
 * many batches stays one query for the list and one for the open row.
 */
const OPEN_PARAM = "open";

/**
 * Which tab the address asks for. Anything other than "archived" is the
 * active tab, so a hand-edited address opens the workflow rather than an
 * error.
 */
function readTab(request: Request): boolean {
	return new URL(request.url).searchParams.get(TAB_PARAM) === ARCHIVED_TAB;
}

export async function loader({ context, request }: Route.LoaderArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);
	const showArchived = readTab(request);
	const query = new URL(request.url).searchParams.get("q") ?? "";
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	const batchFilter = showArchived
		? isNotNull(SampleBatch.metadataArchivedAt)
		: isNull(SampleBatch.metadataArchivedAt);

	const rows = await db
		.select({
			slug: SampleBatch.slug,
			name: SampleBatch.name,
			preparedById: SampleBatch.preparedById,
			preparedBy: { id: User.id, name: User.name },
			archivedAt: SampleBatch.metadataArchivedAt,
			preparationDate: SampleBatch.preparationDate,
			activeMaterial: SampleBatch.activeMaterial,
			support: SampleBatch.support,
			sampleCount: count(Sample.id),
		})
		.from(SampleBatch)
		.innerJoin(User, eq(User.id, SampleBatch.preparedById))
		// Archived samples are left out of the join, so a batch with none left
		// still appears, with a count of zero.
		.leftJoin(Sample, and(eq(Sample.batchId, SampleBatch.id), isNull(Sample.metadataArchivedAt)))
		.where(batchFilter)
		.groupBy(SampleBatch.id)
		.orderBy(desc(SampleBatch.preparationDate), SampleBatch.name)
		.all();

	/*
		Both counts are read on either tab. The archived tab is easy to overlook,
		so its label carries the number of batches waiting in it.
	*/
	const archivedCount = await db
		.select({ total: count() })
		.from(SampleBatch)
		.where(isNotNull(SampleBatch.metadataArchivedAt))
		.get();

	const activeCount = await db
		.select({ total: count() })
		.from(SampleBatch)
		.where(isNull(SampleBatch.metadataArchivedAt))
		.get();

	/*
		A row can only be open when it is on the tab in view. An address naming a
		batch of the other tab, or naming nothing at all, opens no row.
	*/
	const requested = new URL(request.url).searchParams.get(OPEN_PARAM);
	const openBatch =
		requested === null
			? undefined
			: await db
					.select({ id: SampleBatch.id, slug: SampleBatch.slug })
					.from(SampleBatch)
					.where(and(batchFilter, eq(SampleBatch.slug, requested)))
					.get();

	// Each word may match a different recorded field.
	const batches = rows.filter((batch) => {
		const text = [
			batch.name,
			formatBatchComposition(batch),
			batch.preparedBy.name,
			batch.preparationDate,
			formatCalendarDate(batch.preparationDate),
		]
			.filter(Boolean)
			.join(" ")
			.toLowerCase();

		return words.every((word) => text.includes(word));
	});

	return {
		query,
		open: openBatch?.slug ?? null,

		// Archived samples are read as well. The add row suggests the next free
		// label, and a label that was used before is not free.
		openSamples: openBatch
			? (
					await db
						.select({
							id: Sample.id,
							name: Sample.name,
							preparedBy: { id: User.id, name: User.name },
							metadataArchivedAt: Sample.metadataArchivedAt,
						})
						.from(Sample)
						.innerJoin(User, eq(User.id, Sample.preparedById))
						.where(eq(Sample.batchId, openBatch.id))
						.all()
				).sort((left, right) => compareSampleNames(left.name, right.name))
			: null,

		showArchived,
		counts: { active: activeCount?.total ?? 0, archived: archivedCount?.total ?? 0 },
		batches,
	};
}

export async function action({ context, request }: Route.ActionArgs) {
	const values = new FormValues(await request.formData());
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);

	/*
		The open row carries the sample table of its batch. Its forms post here,
		so a rejected label is reported in the row the person is looking at. A
		post to the batch page would answer on that page instead.
	*/
	const batchSlug = values.string("batch", null);

	if (batchSlug !== null) {
		return editSamples(container, db, values, batchSlug);
	}

	// The clicked submit button carries the operation and its target.
	// For example { archive: "pt-al2o3" }.
	const archivedSlug = values.string("archive", null);
	const restoredSlug = values.string("restore", null);
	const slug = archivedSlug ?? restoredSlug;

	if (slug === null) {
		return data({ errors: { form: "The batch action is not recognized." } }, { status: 400 });
	}

	const archiving = archivedSlug !== null;

	/*
		A batch is archived only while it is active, and restored only while it is
		archived. Two people working at the same time therefore cannot undo each
		other. The second click changes no row and answers 404. The statement runs
		as a batch, because only a batch reports the number of changed rows.
	*/
	const [changed] = await db.batch([
		db
			.update(SampleBatch)
			.set({ metadataArchivedAt: archiving ? new Date() : null })
			.where(
				and(
					eq(SampleBatch.slug, slug),
					archiving
						? isNull(SampleBatch.metadataArchivedAt)
						: isNotNull(SampleBatch.metadataArchivedAt),
				),
			),
	]);

	if (changed!.changes === 0) {
		throw new Response(`Batch "${slug}" not found.`, { status: 404 });
	}

	// Stay on the tab the click came from. Archiving leaves the active tab, so
	// the batch is gone from the list that comes back.
	const tab = archiving ? "" : `?${TAB_PARAM}=${ARCHIVED_TAB}`;

	return redirect(`/samples${tab}`, 303);
}

/**
 * Add or delete a sample of the open row. The row stays open afterwards, so
 * the person sees the table they were working in.
 */
async function editSamples(
	container: ServiceContainer,
	db: ApplicationDatabase,
	values: FormValues,
	batchSlug: string,
) {
	// An archived batch is treated as absent. Its samples are read only.
	// The shared add-sample helper accepts a complete batch row.
	const batch = await db
		.select()
		.from(SampleBatch)
		.where(and(eq(SampleBatch.slug, batchSlug), isNull(SampleBatch.metadataArchivedAt)))
		.get();

	if (!batch) {
		throw new Response(`Batch "${batchSlug}" not found.`, { status: 404 });
	}

	const deletedSampleId = values.integer("delete", null);
	let errors: SampleErrors | undefined;

	if (deletedSampleId !== null) {
		errors = await deleteSubmittedSample(db, deletedSampleId);
	} else if (values.has("add")) {
		const [security, logger] = container.get(Security, Logger);

		errors = await addSubmittedSample(
			{
				db,
				logger,
				creatorId: security.userId,
			},
			batch,
			values,
		);
	} else {
		errors = { form: "The sample action is not recognized." };
	}

	if (errors) return data({ errors }, { status: 400 });

	return redirect(`/samples?${OPEN_PARAM}=${batch.slug}`, 303);
}

/**
 * The day a batch was archived. The moment is stored, and only the day is
 * shown, because that is what a reader looks for in the list.
 */
function ArchivedOn({ at }: { at: Date | null }) {
	if (at === null) return <>Unknown</>;

	const day = new Date(at).toISOString().slice(0, 10);

	return <time dateTime={day}>{formatCalendarDate(day)}</time>;
}

export default function SamplesIndex({ actionData, loaderData }: Route.ComponentProps) {
	const { batches, counts, showArchived, open, openSamples, query } = loaderData;

	const navigation = useNavigation();

	// A submission is busy until the new page data has arrived. React Router
	// reports "submitting" while the action runs, then "loading" while the
	// loaders run again. The form data is set during both. Reading only
	// "submitting" releases the buttons for the few milliseconds before the
	// new rows arrive, and that shows as a flicker.
	const submitted = navigation.formData;
	const workingSlug = submitted?.get("archive") ?? submitted?.get("restore");

	const samplesPath = "/samples";

	/*
		The name of a batch opens its row and closes it again.

		The address carries the fragment of the row. The row is therefore brought
		into view, whether the address was clicked here or opened from a link
		someone sent. A row far down a long list does not stay below the fold.
	*/
	const listHref = (archived: boolean) => {
		const params = new URLSearchParams();
		if (archived) params.set(TAB_PARAM, ARCHIVED_TAB);
		if (query) params.set("q", query);

		return `${samplesPath}${params.size ? `?${params}` : ""}`;
	};

	const rowHref = (slug: string) => {
		const url = new URL(listHref(showArchived), "http://localhost");
		if (open !== slug) {
			url.searchParams.set(OPEN_PARAM, slug);
			url.hash = `batch-${slug}`;
		}

		return `${url.pathname}${url.search}${url.hash}`;
	};

	return (
		<div className="space-y-8">
			<div>
				<Heading>Samples</Heading>
				<Text className="mt-2">
					Material prepared together forms a batch. Each batch holds the physical samples cut from
					it.
				</Text>
			</div>

			<ListView
				filter={
					<ListFilter
						id="samples-filter"
						label="Filter samples"
						placeholder="Batch, composition, preparer, or date"
						query={query}
						hiddenFields={showArchived ? { show: "archived" } : {}}
					/>
				}
			>
				<ListPanel
					label="Sample batches"
					busy={navigation.state !== "idle"}
					archive={{
						active: { to: listHref(false), count: counts.active },
						archived: { to: listHref(true), count: counts.archived },
						showArchived,
					}}
				>
					{batches.length === 0 ? (
						<ListEmpty>
							{query.trim()
								? "No batches match the filter."
								: showArchived
									? "No batches have been archived."
									: "No batches have been recorded yet."}
						</ListEmpty>
					) : (
						<ListTable label="Sample batches">
							<ListTableHead>
								<tr>
									<th scope="col">Batch</th>
									<th scope="col">Composition</th>
									<th scope="col">Samples</th>
									<th scope="col">Prepared by</th>
									<th scope="col">Prepared on</th>
									{showArchived && <th scope="col">Archived on</th>}
									<th scope="col" className="w-28 text-left">
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</ListTableHead>

							<tbody className="divide-y divide-border">
								{batches.map((batch) => (
									<Fragment key={batch.slug}>
										<tr id={`batch-${batch.slug}`} className="hover:bg-surface-muted">
											<th scope="row" className="py-3 pr-4 pl-5 font-normal">
												<Link
													to={rowHref(batch.slug)}
													preventScrollReset
													aria-expanded={open === batch.slug}
													aria-controls={`samples-of-${batch.slug}`}
													className="flex items-center gap-1.5 text-left font-medium text-link hover:text-link-hover"
												>
													<ChevronRightIcon
														className={`size-4 shrink-0 transition-transform ${
															open === batch.slug ? "rotate-90" : ""
														}`}
													/>
													{batch.name}
												</Link>
											</th>

											<td className="py-3 pr-4 text-foreground-muted">
												{formatBatchComposition(batch) ?? "Not recorded"}
											</td>

											<td className="py-3 pr-4 text-foreground-muted">{batch.sampleCount}</td>

											<td className="py-3 pr-4 text-foreground-muted">{batch.preparedBy.name}</td>

											<td className="py-3 pr-4 text-foreground-muted">
												<time dateTime={batch.preparationDate}>
													{formatCalendarDate(batch.preparationDate)}
												</time>
											</td>

											{showArchived && (
												<td className="py-3 pr-4 text-foreground-muted">
													<ArchivedOn at={batch.archivedAt} />
												</td>
											)}

											<td className="py-3 pr-5 text-left">
												<Form method="post">
													{showArchived ? (
														<button
															type="submit"
															name="restore"
															value={batch.slug}
															disabled={submitted !== undefined}
															aria-label={`Restore ${batch.name}`}
															className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground-muted hover:bg-canvas-sunken hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
														>
															<ArrowUturnLeftIcon className="size-4" />
															{workingSlug === batch.slug ? "Restoring…" : "Restore"}
														</button>
													) : (
														<button
															type="submit"
															name="archive"
															value={batch.slug}
															disabled={submitted !== undefined}
															aria-label={`Archive ${batch.name}`}
															className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground-muted hover:bg-danger-surface hover:text-danger-surface-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
														>
															<ArchiveBoxArrowDownIcon className="size-4" />
															{workingSlug === batch.slug ? "Archiving…" : "Archive"}
														</button>
													)}
												</Form>
											</td>
										</tr>

										{open === batch.slug && openSamples !== null && (
											<SampleRows
												batch={batch}
												batchSlug={batch.slug}
												samples={openSamples}
												columns={{
													total: showArchived ? 7 : 6,
													label: 0,
													preparedBy: 3,
													preparedOn: 4,
													actions: showArchived ? 6 : 5,
												}}
												archived={showArchived}
												indent
												errors={actionData?.errors}
												hiddenFields={{ batch: batch.slug }}
												preventScrollReset
											/>
										)}

										{/*
											The name of the batch opens the row, so it is no longer a
											link. These two carry on to the batch itself.
										*/}
										{open === batch.slug && (
											<tr>
												<td colSpan={showArchived ? 7 : 6} className="py-2 pr-5 pl-10">
													<div className="flex gap-4 text-sm">
														<Link
															to={`${samplesPath}/${batch.slug}`}
															className="text-link hover:text-link-hover"
														>
															Open batch page
														</Link>

														{showArchived ? null : (
															<Link
																to={`${samplesPath}/${batch.slug}/edit`}
																className="text-foreground-muted hover:text-foreground"
															>
																Edit batch
															</Link>
														)}
													</div>
												</td>
											</tr>
										)}
									</Fragment>
								))}
							</tbody>
						</ListTable>
					)}
				</ListPanel>
			</ListView>

			<Link
				to={`${samplesPath}/new`}
				className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
			>
				<PlusIcon className="size-4" />
				Create batch
			</Link>
		</div>
	);
}
