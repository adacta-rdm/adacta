import { ArchiveBoxIcon, BeakerIcon, PencilSquareIcon } from "@heroicons/react/20/solid";
import { and, eq, isNull } from "drizzle-orm";
import { data, Link, redirect } from "react-router";

import { services } from "~/app/.server/context.ts";
import { formatBatchComposition } from "~/app/lib/batchComposition.ts";
import { formatCalendarDate } from "~/app/lib/dates.ts";
import { compareSampleNames } from "~/app/lib/sampleNames.ts";
import {
	addSubmittedSample,
	deleteSubmittedSample,
	type SampleContext,
	type SampleErrors,
} from "~/app/lib/sampleSubmission.ts";
import { SampleTable } from "~/app/route-components/SampleTable.tsx";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { Sample } from "~/drizzle/schema/repo.Sample.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import { FormValues } from "~/lib/form-values/FormValues.ts";
import { Logger } from "~/lib/logger/Logger.ts";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer.ts";

import type { Route } from "./+types/$repo.samples.$batchSlug.ts";

export async function loader({ context, params }: Route.LoaderArgs) {
	const container = context.get(services);
	const [db, access] = container.get(RepoDB, RepoAccess);
	const batch = await findBatch(db, params.batchSlug);

	if (!batch) {
		throw new Response(`Sample "${params.batchSlug}" not found.`, { status: 404 });
	}

	// We return all samples, even archived ones. The UI needs the archived ones
	// as well. It can then suggest the next available name.
	// The assumption is that there won't be enough samples per batch to cause
	// performance issues.
	const samples = await db
		.select()
		.from(Sample)
		.where(and(eq(Sample.batchId, batch.id)));

	samples.sort((left, right) => compareSampleNames(left.name, right.name));

	const users = new Map((await access.users()).map((user) => [user.id, user]));

	return {
		// An archived batch keeps its page, so a link from the archived tab
		// leads somewhere. The page then says that the batch is archived and
		// offers no way to change it.
		archived: batch.metadataArchivedAt !== null,

		// The map holds the users who may open the repository. A preparer whose
		// grant was revoked is therefore absent from it. These lookups then return
		// undefined.
		batch: { ...batch, preparedBy: users.get(batch.preparedById) },
		samples: samples.map((sample) => ({
			...sample,
			preparedBy: users.get(sample.preparedById),
		})),
		users,
	};
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const values = new FormValues(await request.formData());
	const container = context.get(services);
	const db = container.get(RepoDB);
	const batch = await getBatch(db, params.batchSlug);

	if (!batch) {
		throw new Response(`Sample "${params.batchSlug}" not found.`, { status: 404 });
	}

	// The clicked submit button carries the operation and any target.
	// Examples:
	// { add: "", name: "#01", preparedById: "" }
	// { delete: "17" }
	const deletedSampleId = values.integer("delete", null);
	let errors: SampleErrors | undefined;

	if (deletedSampleId !== null) {
		await deleteSubmittedSample(db, deletedSampleId);
	} else if (values.has("add")) {
		errors = await addSubmittedSample(await sampleContext(container, params.repo), batch, values);
	} else {
		errors = { form: "The sample action is not recognized." };
	}

	if (errors) return data({ errors }, { status: 400 });

	return redirect(`/${params.repo}/samples/${batch.slug}`, 303);
}

/**
 * The pieces app/lib needs to add a sample. They are read from the container
 * here, so the rules themselves stay free of it.
 */
async function sampleContext(
	container: ServiceContainer,
	repository: string,
): Promise<SampleContext> {
	const [db, access, security, logger] = container.get(RepoDB, RepoAccess, Security, Logger);

	return {
		db,
		logger,
		preparerIds: (await access.users()).map((user) => user.id),
		creatorId: security.userId,
		repository,
	};
}

export default function RepoSamplesBatchSlug({
	actionData,
	loaderData,
	params,
}: Route.ComponentProps) {
	const { batch, samples, users, archived } = loaderData;
	const composition = formatBatchComposition(batch);

	return (
		<div className="space-y-8">
			{archived && (
				<p className="rounded-lg border border-warning-border bg-warning-surface px-4 py-3 text-sm text-warning-surface-foreground">
					<ArchiveBoxIcon className="mr-1.5 inline size-4 align-text-bottom" />
					This batch is archived. It can be read, and it cannot be changed. Restore it from the{" "}
					<Link
						to={`/${params.repo}/samples?show=archived`}
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
							to={`/${params.repo}/samples/${batch.slug}/edit`}
							className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground-muted hover:bg-surface-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
						>
							<PencilSquareIcon className="size-4" />
							Edit
						</Link>
					)}
				</div>

				<p className="mt-2 text-sm text-foreground-muted">
					Preparation date:{" "}
					<time dateTime={batch.preparationDate}>{formatCalendarDate(batch.preparationDate)}</time>
				</p>
				<p className="mt-2 text-sm text-foreground-muted">
					Prepared by: {batch.preparedBy?.name ?? "Unknown"}
				</p>
				{composition ? (
					<p className="mt-2 flex items-center gap-2 text-sm text-foreground-muted">
						<BeakerIcon className="size-4" />
						{composition}
					</p>
				) : (
					<Text className="mt-2">No composition has been recorded.</Text>
				)}
			</div>

			<section className="overflow-hidden rounded-xl border border-border bg-surface">
				<div className="px-5 pt-5 pb-4">
					<Subheading>Samples</Subheading>
				</div>

				<SampleTable
					batch={batch}
					batchSlug={batch.slug}
					samples={samples}
					preparers={[...users.values()]}
					archived={archived}
					errors={actionData?.errors}
				/>
			</section>
		</div>
	);
}

/**
 * The batch with this slug, archived or not. The page uses this, because an
 * archived batch is still worth reading.
 */
async function findBatch(db: RepoDB, batchSlug: string) {
	return await db.select().from(SampleBatch).where(eq(SampleBatch.slug, batchSlug)).get();
}

/**
 * The batch with this slug, only while it is active. Every form on the page
 * uses this. An archived batch is therefore treated as absent, and a submit
 * from an old page answers 404.
 */
async function getBatch(db: RepoDB, batchSlug: string) {
	return await db
		.select()
		.from(SampleBatch)
		.where(and(eq(SampleBatch.slug, batchSlug), isNull(SampleBatch.metadataArchivedAt)))
		.get();
}
