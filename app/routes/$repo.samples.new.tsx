import { data, Form, Link, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context";
import { isCalendarDate } from "~/app/lib/dates";
import { availableSlug, slugify } from "~/app/lib/slugs";
import { RepoAccess } from "~/app/services/RepoAccess";
import { RepoDB } from "~/app/services/RepoDB";
import { Security } from "~/app/services/Security";
import { Heading } from "~/catalyst-ui/heading";
import { Text } from "~/catalyst-ui/text";
import type { NewEntity } from "~/drizzle/Schema";
import { SampleBatch } from "~/drizzle/schema/repo.SampleBatch";
import { FormValues } from "~/lib/form-values/FormValues";

import type { Route } from "./+types/$repo.samples.new";

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

	const name = values.string("name");
	const preparationDate = values.string("preparationDate");
	const preparedById = values.string("preparedById");

	if (!name) {
		return data({ error: "A batch name is required." }, { status: 400 });
	}

	if (!slugify(name)) {
		return data(
			{ error: "A batch name must contain at least one letter or number." },
			{ status: 400 },
		);
	}

	if (!isCalendarDate(preparationDate)) {
		return data({ error: "The preparation date is not a valid calendar date." }, { status: 400 });
	}

	if (!preparedById) {
		return data({ error: "A preparer is required." }, { status: 400 });
	}

	const container = context.get(services);
	const [db, access, security] = container.get(RepoDB, RepoAccess, Security);

	if (!(await access.users()).some((user) => user.id === preparedById)) {
		return data({ error: "The selected preparer cannot access this repository." }, { status: 400 });
	}

	// The slug is taken from the name. A batch already using that slug pushes the
	// new one to a numbered variant.
	const slug = availableSlug(
		name,
		db
			.select({ slug: SampleBatch.slug })
			.from(SampleBatch)
			.all()
			.map((batch) => batch.slug),
	);

	const batch = db
		.insert(SampleBatch)
		.values({
			slug,
			name,
			preparationDate,
			preparedById,
			activeMaterial: values.string("activeMaterial", null),
			support: values.string("support", null),
			metadataCreatorId: security.userId,
			metadataCreationTimestamp: new Date(),
		} satisfies NewEntity<"SampleBatch">)
		.returning({ slug: SampleBatch.slug })
		.get();

	return redirect(`/${params.repo}/samples/${batch.slug}`, 303);
}

export default function NewSampleBatch({ actionData, loaderData, params }: Route.ComponentProps) {
	const navigation = useNavigation();
	const submitting = navigation.state === "submitting";

	return (
		<>
			<Heading>Create sample batch</Heading>
			<Text className="mt-2">A batch describes material prepared together.</Text>

			<Form method="post" className="mt-8 max-w-xl space-y-6">
				<FormField name="name" label="Batch name" required />
				<FormField
					name="preparationDate"
					label="Preparation date"
					type="date"
					required
					description="The date on which the batch material was prepared."
				/>
				<label className="block">
					<span className="text-sm font-medium text-foreground">Prepared by</span>
					<select
						name="preparedById"
						required
						defaultValue={loaderData.currentUserId}
						className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-focus focus:outline-none"
					>
						{loaderData.preparers.map((preparer) => (
							<option key={preparer.id} value={preparer.id}>
								{preparer.name}
							</option>
						))}
					</select>
				</label>
				<FormField name="activeMaterial" label="Active material" placeholder="Pt" />
				<FormField name="support" label="Support" placeholder="Al2O3" />

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

function FormField({
	name,
	label,
	required,
	placeholder,
	type = "text",
	description,
}: {
	name: string;
	label: string;
	required?: boolean;
	placeholder?: string;
	type?: "text" | "date";
	description?: string;
}) {
	return (
		<label className="block">
			<span className="text-sm font-medium text-foreground">{label}</span>
			{description ? (
				<span className="mt-1 block text-sm text-foreground-muted">{description}</span>
			) : null}
			<input
				name={name}
				type={type}
				required={required}
				placeholder={placeholder}
				className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground placeholder:text-foreground-muted focus:border-focus focus:outline-none"
			/>
		</label>
	);
}
