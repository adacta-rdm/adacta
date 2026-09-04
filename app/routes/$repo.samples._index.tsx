/**
 * Every batch in the repository.
 *
 * The most recently prepared batch comes first, because a laboratory usually
 * works on what it just made. Batches prepared on the same day are ordered by
 * name.
 *
 * A batch is archived rather than deleted. Its samples point at it, and its
 * preparation is a record of work that was done. Archiving takes it out of
 * the workflow and leaves both intact.
 */
import { ArchiveBoxArrowDownIcon, PlusIcon } from "@heroicons/react/20/solid";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context";
import { formatBatchComposition } from "~/app/lib/batchComposition";
import { formatCalendarDate } from "~/app/lib/dates";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { Heading, Subheading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";
import { Sample } from "~/drizzle/schema/repo.Sample";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";
import { FormValues } from "~/lib/form-values/FormValues";

import type { Route } from "./+types/$repo.samples._index";

export async function loader({ context }: Route.LoaderArgs) {
	const container = context.get(services);
	const [db, access] = container.get(RepoDB, RepoAccess);

	const rows = db
		.select()
		.from(SampleBatch)
		.where(isNull(SampleBatch.metadataArchivedAt))
		.orderBy(desc(SampleBatch.preparationDate), SampleBatch.name)
		.all();

	// One count for every batch, rather than one query per row.
	const sampleCounts = new Map(
		db
			.select({ batchId: Sample.batchId, total: count() })
			.from(Sample)
			.where(isNull(Sample.metadataArchivedAt))
			.groupBy(Sample.batchId)
			.all()
			.map((row) => [row.batchId, row.total]),
	);

	// The list holds the users who may open the repository. A preparer whose
	// grant was revoked is therefore absent from it, and the lookup returns
	// undefined.
	const users = new Map((await access.users()).map((user) => [user.id, user]));

	return {
		batches: rows.map((batch) => ({
			slug: batch.slug,
			name: batch.name,
			preparationDate: batch.preparationDate,
			activeMaterial: batch.activeMaterial,
			support: batch.support,
			preparedBy: users.get(batch.preparedById),
			sampleCount: sampleCounts.get(batch.id) ?? 0,
		})),
	};
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const values = new FormValues(await request.formData());
	const db = context.get(services).get(RepoDB);

	// The clicked submit button carries the operation and its target.
	// For example { archive: "pt-al2o3" }.
	const archivedSlug = values.string("archive", null);

	if (archivedSlug === null) {
		return data({ errors: { form: "The batch action is not recognized." } }, { status: 400 });
	}

	const archived = db
		.update(SampleBatch)
		.set({ metadataArchivedAt: new Date() })
		.where(and(eq(SampleBatch.slug, archivedSlug), isNull(SampleBatch.metadataArchivedAt)))
		.run();

	if (archived.changes === 0) {
		throw new Response(`Batch "${archivedSlug}" not found.`, { status: 404 });
	}

	return redirect(`/${params.repo}/samples`, 303);
}

export default function RepoSamplesIndex({ loaderData, params }: Route.ComponentProps) {
	const { batches } = loaderData;

	const navigation = useNavigation();
	const submitted = navigation.state === "submitting" ? navigation.formData : undefined;
	const archivingSlug = submitted?.get("archive");

	return (
		<div className="space-y-8">
			<div>
				<Heading>Samples</Heading>
				<Text className="mt-2">
					Material prepared together forms a batch. Each batch holds the physical samples cut from
					it.
				</Text>
			</div>

			<section className="overflow-hidden rounded-xl border border-border bg-surface">
				<div className="px-5 pt-5">
					<Subheading>Batches</Subheading>
				</div>

				{batches.length === 0 ? (
					<Text className="px-5 pt-2 pb-5">No batches have been recorded yet.</Text>
				) : (
					<div className="mt-4 overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead className="border-b border-border text-xs font-medium text-foreground-muted">
								<tr>
									<th scope="col" className="pb-2 pl-5 pr-4">
										Batch
									</th>
									<th scope="col" className="pb-2 pr-4">
										Composition
									</th>
									<th scope="col" className="pb-2 pr-4">
										Samples
									</th>
									<th scope="col" className="pb-2 pr-4">
										Prepared by
									</th>
									<th scope="col" className="pb-2 pr-4">
										Prepared on
									</th>
									<th scope="col" className="w-28 pb-2 pr-5 text-left">
										<span className="sr-only">Actions</span>
									</th>
								</tr>
							</thead>

							<tbody className="divide-y divide-border">
								{batches.map((batch) => (
									<tr key={batch.slug}>
										<th scope="row" className="py-3 pl-5 pr-4 font-normal">
											<Link
												to={`/${params.repo}/samples/${batch.slug}`}
												className="font-medium text-link hover:text-link-hover"
											>
												{batch.name}
											</Link>
										</th>

										<td className="py-3 pr-4 text-foreground-muted">
											{formatBatchComposition(batch) ?? "Not recorded"}
										</td>

										<td className="py-3 pr-4 text-foreground-muted">{batch.sampleCount}</td>

										<td className="py-3 pr-4 text-foreground-muted">
											{batch.preparedBy?.name ?? "Unknown"}
										</td>

										<td className="py-3 pr-4 text-foreground-muted">
											<time dateTime={batch.preparationDate}>
												{formatCalendarDate(batch.preparationDate)}
											</time>
										</td>

										<td className="py-3 pr-5 text-left">
											<Form method="post">
												<button
													type="submit"
													name="archive"
													value={batch.slug}
													disabled={submitted !== undefined}
													aria-label={`Archive ${batch.name}`}
													className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-foreground-muted hover:bg-danger-surface hover:text-danger-surface-foreground focus-visible:outline-2 focus-visible:outline-focus disabled:opacity-50"
												>
													<ArchiveBoxArrowDownIcon className="size-4" />
													{archivingSlug === batch.slug ? "Archiving…" : "Archive"}
												</button>
											</Form>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</section>

			<Link
				to={`/${params.repo}/samples/new`}
				className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
			>
				<PlusIcon className="size-4" />
				Create batch
			</Link>
		</div>
	);
}
