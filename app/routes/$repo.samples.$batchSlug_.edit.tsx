/**
 * Change the description of one sample batch.
 *
 * The slug is not changed with the name. A slug is the address of the batch,
 * and links to it are written down elsewhere. A renamed batch therefore keeps
 * the address it was created with.
 *
 * An archived batch cannot be edited. The page answers 404 for one, so the
 * archived record stays as it was.
 */
import { and, eq, isNull } from "drizzle-orm";
import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { SampleBatchFields } from "~/app/components/SampleBatchFields.tsx";
import { readSampleBatchFields } from "~/app/lib/sampleBatchFields.ts";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import { FormValues } from "~/lib/form-values/FormValues.ts";

import type { Route } from "./+types/$repo.samples.$batchSlug_.edit.ts";

export function meta() {
	return [{ title: "Edit sample batch — Adacta" }];
}

export async function loader({ context, params }: Route.LoaderArgs) {
	const container = context.get(services);
	const [db, access] = container.get(RepoDB, RepoAccess);
	const batch = await getActiveBatch(db, params.batchSlug);

	if (!batch) {
		throw new Response(`Sample "${params.batchSlug}" not found.`, { status: 404 });
	}

	return { batch, preparers: await access.users() };
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const values = new FormValues(await request.formData());
	const container = context.get(services);
	const [db, access] = container.get(RepoDB, RepoAccess);
	const batch = await getActiveBatch(db, params.batchSlug);

	if (!batch) {
		throw new Response(`Sample "${params.batchSlug}" not found.`, { status: 404 });
	}

	const read = readSampleBatchFields(values);

	if (!read.ok) {
		return data({ error: read.error }, { status: 400 });
	}

	const { fields } = read;

	if (!(await access.users()).some((user) => user.id === fields.preparedById)) {
		return data({ error: "The selected preparer cannot access this repository." }, { status: 400 });
	}

	await db.update(SampleBatch).set(fields).where(eq(SampleBatch.id, batch.id)).run();

	return redirect(`/${params.repo}/samples/${batch.slug}`, 303);
}

export default function RepoSamplesBatchSlugEdit({
	actionData,
	loaderData,
	params,
}: Route.ComponentProps) {
	const { batch, preparers } = loaderData;

	const navigation = useNavigation();
	// Busy until the batch page has loaded, not only while the action runs.
	// See SampleTable for why.
	const submitting = navigation.formData !== undefined;

	const batchPath = `/${params.repo}/samples/${batch.slug}`;

	return (
		<>
			<Heading>Edit sample batch</Heading>
			<Text className="mt-2">The address of the batch stays the same when you rename it.</Text>

			<Form method="post" className="mt-8 max-w-xl space-y-6">
				<SampleBatchFields
					preparers={preparers}
					values={{
						name: batch.name,
						preparationDate: batch.preparationDate,
						preparedById: batch.preparedById,
						activeMaterial: batch.activeMaterial ?? "",
						support: batch.support ?? "",
					}}
				/>

				{actionData?.error ? (
					<p role="alert" className="text-sm text-danger">
						{actionData.error}
					</p>
				) : null}

				<div className="flex items-center gap-3">
					<button
						type="submit"
						disabled={submitting}
						className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
					>
						{submitting ? "Saving…" : "Save changes"}
					</button>

					<Link to={batchPath} className="text-sm text-foreground-muted hover:text-foreground">
						Cancel
					</Link>
				</div>
			</Form>
		</>
	);
}

/**
 * The batch with this slug, only while it is active. An archived batch is
 * therefore treated as absent, and the page answers 404 for it.
 */
async function getActiveBatch(db: RepoDB, batchSlug: string) {
	return await db
		.select()
		.from(SampleBatch)
		.where(and(eq(SampleBatch.slug, batchSlug), isNull(SampleBatch.metadataArchivedAt)))
		.get();
}
