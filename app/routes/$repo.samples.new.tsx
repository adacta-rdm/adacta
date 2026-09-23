import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { SampleBatchFields } from "~/app/components/SampleBatchFields.tsx";
import { readSampleBatchFields } from "~/app/lib/sampleBatchFields.ts";
import { availableSlug } from "~/app/lib/slugs.ts";
import { RepoAccess } from "~/app/services/RepoAccess.ts";
import { RepoDB } from "~/app/services/RepoDB.ts";
import { Security } from "~/app/services/Security.ts";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import type { NewEntity } from "~/drizzle/Schema.ts";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch.ts";
import { FormValues } from "~/lib/form-values/FormValues.ts";

import type { Route } from "./+types/$repo.samples.new.ts";

export function meta() {
	return [{ title: "Create sample batch — Adacta" }];
}

export async function loader({ context }: Route.LoaderArgs) {
	const container = context.get(services);
	return {
		preparers: await container.get(RepoAccess).users(),
		currentUserId: container.get(Security).userId,
	};
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const values = new FormValues(await request.formData());

	const read = readSampleBatchFields(values);

	if (!read.ok) {
		return data({ error: read.error }, { status: 400 });
	}

	const { fields } = read;

	const container = context.get(services);
	const [db, access, security] = container.get(RepoDB, RepoAccess, Security);

	if (!(await access.users()).some((user) => user.id === fields.preparedById)) {
		return data({ error: "The selected preparer cannot access this repository." }, { status: 400 });
	}

	// The slug is taken from the name. A batch already using that slug pushes the
	// new one to a numbered variant.
	const slug = availableSlug(
		fields.name,
		(await db.select({ slug: SampleBatch.slug }).from(SampleBatch).all()).map(
			(batch) => batch.slug,
		),
	);

	const batch = await db
		.insert(SampleBatch)
		.values({
			slug,
			...fields,
			metadataCreatorId: security.userId,
			metadataCreationTimestamp: new Date(),
		} satisfies NewEntity<"SampleBatch">)
		.returning({ slug: SampleBatch.slug })
		.get();

	return redirect(`/${params.repo}/samples/${batch.slug}`, 303);
}

export default function NewSampleBatch({ actionData, loaderData, params }: Route.ComponentProps) {
	const navigation = useNavigation();
	// Busy until the new page has loaded, not only while the action runs.
	// See SampleTable for why.
	const submitting = navigation.formData !== undefined;

	return (
		<>
			<Heading>Create sample batch</Heading>
			<Text className="mt-2">A batch describes material prepared together.</Text>

			<Form method="post" className="mt-8 max-w-xl space-y-6">
				<SampleBatchFields
					preparers={loaderData.preparers}
					values={{
						name: "",
						preparationDate: "",
						preparedById: loaderData.currentUserId,
						activeMaterial: "",
						support: "",
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
						{submitting ? "Creating…" : "Create batch"}
					</button>
					<Link
						to={`/${params.repo}/samples`}
						className="text-sm text-foreground-muted hover:text-foreground"
					>
						Cancel
					</Link>
				</div>
			</Form>
		</>
	);
}
