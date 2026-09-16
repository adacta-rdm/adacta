import { data, Form, redirect, useNavigation } from "react-router";

import { services } from "~/app/.server/context.ts";
import { RepoAccess, UserEmailAlreadyExistsError } from "~/app/services/RepoAccess.ts";
import { Badge } from "~/catalyst-ui/badge.tsx";
import { Description, ErrorMessage, Field, Fieldset, Label } from "~/catalyst-ui/fieldset.tsx";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Input } from "~/catalyst-ui/input.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { FormValues } from "~/lib/form-values/FormValues.ts";

import type { Route } from "./+types/$repo.users.ts";

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function meta() {
	return [{ title: "Users — Adacta" }];
}

export async function loader({ context }: Route.LoaderArgs) {
	return { users: await context.get(services).get(RepoAccess).repositoryUsers() };
}

export async function action({ context, request, params }: Route.ActionArgs) {
	const values = new FormValues(await request.formData());
	const name = values.string("name");
	const email = values.string("email").toLowerCase();
	const errors: { name?: string; email?: string } = {};

	if (!name) errors.name = "A name is required.";
	if (!email) {
		errors.email = "An email address is required.";
	} else if (!EMAIL_ADDRESS.test(email)) {
		errors.email = "Enter a valid email address.";
	}

	if (Object.keys(errors).length > 0) {
		return data({ errors, values: { name, email } }, { status: 400 });
	}

	try {
		await context.get(services).get(RepoAccess).createRecordOnlyUser({ name, email });
	} catch (error) {
		if (error instanceof UserEmailAlreadyExistsError) {
			const duplicateErrors: typeof errors = {
				email: "This email address already belongs to a user.",
			};

			return data(
				{
					errors: duplicateErrors,
					values: { name, email },
				},
				{ status: 400 },
			);
		}

		throw error;
	}

	return redirect(`/${params.repo}/users`, 303);
}

export default function RepoUsers({ actionData, loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const submitting = navigation.formAction?.endsWith("/users") && navigation.formData !== undefined;

	return (
		<>
			<Heading>Users</Heading>
			<Text className="mt-2 max-w-2xl">
				Users can be credited for work recorded in this repository. A record-only user has no
				sign-in account and therefore cannot open Adacta.
			</Text>

			<div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
				<section aria-labelledby="repository-users-heading">
					<Subheading id="repository-users-heading">Repository users</Subheading>

					<ul className="mt-3 divide-y divide-border border-y border-border">
						{loaderData.users.map((user) => (
							<li
								key={user.id}
								className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0">
									<p className="font-medium text-foreground">{user.name}</p>
									<p className="mt-0.5 break-all text-sm text-foreground-muted">{user.email}</p>
								</div>

								<Badge
									color={user.canSignIn ? "green" : "zinc"}
									className="self-start sm:self-auto"
								>
									{user.canSignIn ? "Can sign in" : "Record only"}
								</Badge>
							</li>
						))}
					</ul>
				</section>

				<section
					aria-labelledby="add-user-heading"
					className="border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10"
				>
					<Subheading id="add-user-heading">Add record-only user</Subheading>
					<Text className="mt-1">
						Use this user when recording work completed by someone who does not need access.
					</Text>

					<Form method="post" className="mt-6">
						<Fieldset>
							<Field>
								<Label>Name</Label>
								<Input
									type="text"
									name="name"
									required
									invalid={Boolean(actionData?.errors.name)}
									defaultValue={actionData?.values.name}
								/>
								{actionData?.errors.name ? (
									<ErrorMessage>{actionData.errors.name}</ErrorMessage>
								) : null}
							</Field>

							<Field className="mt-6">
								<Label>Email</Label>
								<Description>
									The address identifies this person. No invitation is sent.
								</Description>
								<Input
									type="email"
									name="email"
									required
									invalid={Boolean(actionData?.errors.email)}
									defaultValue={actionData?.values.email}
								/>
								{actionData?.errors.email ? (
									<ErrorMessage>{actionData.errors.email}</ErrorMessage>
								) : null}
							</Field>
						</Fieldset>

						<button
							type="submit"
							disabled={submitting}
							className="mt-6 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-50"
						>
							{submitting ? "Adding…" : "Add user"}
						</button>
					</Form>
				</section>
			</div>
		</>
	);
}
