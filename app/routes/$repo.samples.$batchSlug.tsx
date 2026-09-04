import { BeakerIcon } from "@heroicons/react/20/solid";
import { and, eq, isNull } from "drizzle-orm";
import { data, redirect } from "react-router";

import { services } from "~/app/.server/context";
import { addSample } from "~/app/lib/addSample";
import { formatBatchComposition } from "~/app/lib/batchComposition";
import { EntityAlreadyExistsError } from "~/app/lib/error/EntityAlreadyExistsError";
import { SlugAllocationError } from "~/app/lib/error/SlugAllocationError";
import { compareSampleNames } from "~/app/lib/sampleNames";
import { SampleTable } from "~/app/route-components/SampleTable";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { Security } from "~/app/services/Security";
import { Heading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";
import type { Entity } from "~/drizzle/Schema";
import { Sample } from "~/drizzle/schema/repo.Sample";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";
import { FormValues } from "~/lib/form-values/FormValues";
import { Logger } from "~/lib/logger/Logger";
import type { ServiceContainer } from "~/lib/service-container/ServiceContainer";

import type { Route } from "./+types/$repo.samples.$batchSlug";

type ActionErrors = Partial<Record<"form" | "name" | "preparedById", string>>;

export async function loader({ context, params }: Route.LoaderArgs) {
	const container = context.get(services);
	const [db, access] = container.get(RepoDB, RepoAccess);
	const batch = getBatch(db, params.batchSlug);

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
	const batch = getBatch(db, params.batchSlug);

	if (!batch) {
		throw new Response(`Sample "${params.batchSlug}" not found.`, { status: 404 });
	}

	// The clicked submit button carries the operation and any target.
	// Examples:
	// { add: "", name: "#01", preparedById: "" }
	// { delete: "17" }
	const deletedSampleId = values.integer("delete", null);
	let errors: ActionErrors | undefined;

	if (deletedSampleId !== null) {
		deleteSubmittedSample(db, deletedSampleId);
	} else if (values.has("add")) {
		errors = await addSubmittedSample(container, batch, values, params.repo);
	} else {
		errors = { form: "The sample action is not recognized." };
	}

	if (errors) return data({ errors }, { status: 400 });

	return redirect(`/${params.repo}/samples/${batch.slug}`, 303);
}

function deleteSubmittedSample(db: RepoDB, sampleId: number): void {
	const deleted = db
		.delete(Sample)
		.where(and(eq(Sample.id, sampleId), isNull(Sample.metadataArchivedAt)))
		.run();

	if (deleted.changes === 0) {
		throw new Response("Sample not found.", { status: 404 });
	}
}

async function addSubmittedSample(
	container: ServiceContainer,
	batch: Entity<"SampleBatch">,
	values: FormValues,
	repository: string,
): Promise<ActionErrors | undefined> {
	const [db, access, security, logger] = container.get(RepoDB, RepoAccess, Security, Logger);
	const errors: ActionErrors = {};
	const name = values.string("name");
	const preparedById = values.string("preparedById", batch.preparedById);

	if (!name) errors.name = "A sample name is required.";

	if (!(await access.users()).some((user) => user.id === preparedById)) {
		errors.preparedById = "The selected preparer cannot access this repository.";
	}

	if (Object.keys(errors).length > 0) return errors;

	try {
		await addSample(db, {
			batchId: batch.id,
			name,
			preparedById,
			metadataCreatorId: security.userId,
			metadataCreationTimestamp: new Date(),
		});
	} catch (error) {
		if (error instanceof EntityAlreadyExistsError) {
			return { name: `This batch already contains a sample named "${name}".` };
		}

		if (error instanceof SlugAllocationError) {
			logger
				.bind({
					event: "sample_slug_allocation_failed",
					repository,
					batchId: batch.id,
					sampleName: name,
					baseSlug: error.base,
					attempts: error.attempts,
				})
				.error(error.message);

			return {
				name: "A URL identifier could not be created for this sample. Choose a name that differs by more than punctuation.",
			};
		}

		throw error;
	}

	return undefined;
}

export default function RepoSamplesBatchSlug({ loaderData }: Route.ComponentProps) {
	const { batch } = loaderData;
	const composition = formatBatchComposition(batch);

	return (
		<div className="space-y-8">
			<div>
				<Heading>{batch.name}</Heading>
				<p className="mt-2 text-sm text-foreground-muted">
					Preparation date:{" "}
					<time dateTime={batch.preparationDate}>{formatDateOnly(batch.preparationDate)}</time>
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

			<SampleTable />
		</div>
	);
}

function formatDateOnly(date: string): string {
	return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(
		new Date(`${date}T00:00:00.000Z`),
	);
}

function getBatch(db: RepoDB, batchSlug: string) {
	return db
		.select()
		.from(SampleBatch)
		.where(and(eq(SampleBatch.slug, batchSlug), isNull(SampleBatch.metadataArchivedAt)))
		.get();
}
