import { isAPIError } from "better-auth/api";
import { and, asc, eq, gt, like, max, sql } from "drizzle-orm";
import { data, Form, redirect, useNavigation, useFetcher } from "react-router";

import { services } from "~/app/.server/context.ts";
import type { BreadcrumbHandle } from "~/app/components/PageBreadcrumbs.tsx";
import { ApplicationDatabase } from "~/app/services/ApplicationDatabase.ts";
import { UserAccess, UserRoleError } from "~/app/services/UserAccess.ts";
import { UserInvitations, InvitationError } from "~/app/services/UserInvitations.ts";
import { UserManager, UserEmailAlreadyExistsError } from "~/app/services/UserManager.ts";
import { Badge } from "~/catalyst-ui/badge.tsx";
import { Button } from "~/catalyst-ui/button.tsx";
import { Description, ErrorMessage, Field, Fieldset, Label } from "~/catalyst-ui/fieldset.tsx";
import { Heading, Subheading } from "~/catalyst-ui/heading.tsx";
import { Input } from "~/catalyst-ui/input.tsx";
import { Select } from "~/catalyst-ui/select.tsx";
import { Text } from "~/catalyst-ui/text.tsx";
import { Account, User, Verification } from "~/drizzle/schema/BetterAuth.ts";
import { FormValues } from "~/lib/form-values/FormValues.ts";

import type { Route } from "./+types/users.ts";

export const handle = { breadcrumb: "Users" } satisfies BreadcrumbHandle;

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function meta() {
	return [{ title: "Users — Adacta" }];
}

export async function loader({ context }: Route.LoaderArgs) {
	const container = context.get(services);
	const db = container.get(ApplicationDatabase);

	// Aggregate pending links before joining so each identity appears once.
	const invitations = db
		.select({
			userId: Verification.value,
			expiresAt: max(Verification.expiresAt).as("expiresAt"),
		})
		.from(Verification)
		.where(
			and(
				like(Verification.identifier, "reset-password:%"),
				gt(Verification.expiresAt, new Date()),
			),
		)
		.groupBy(Verification.value)
		.as("invitations");
	const canSignIn =
		sql<boolean>`exists (select 1 from ${Account} where ${Account.userId} = ${User.id})`.mapWith(
			Boolean,
		);
	const users = await db
		.select({
			id: User.id,
			name: User.name,
			email: User.email,
			role: User.role,
			canSignIn,
			invitationExpiresAt: invitations.expiresAt,
		})
		.from(User)
		.leftJoin(invitations, and(eq(invitations.userId, User.id), sql`not ${canSignIn}`))
		.orderBy(asc(User.name), asc(User.id));

	return {
		users,
		isAdmin: await container.get(UserAccess).isAdmin(),
	};
}

export async function action({ context, request }: Route.ActionArgs) {
	const values = new FormValues(await request.formData());
	const intent = values.string("intent", "create");
	const container = context.get(services);
	const errors: { name?: string; email?: string; form?: string } = {};
	const failure = (message: string, status = 400) =>
		data(
			{ errors: { ...errors, form: message }, values: { name: "", email: "" }, message: "" },
			{ status },
		);
	if (intent !== "create") await container.get(UserAccess).requireAdmin();
	if (["resend", "cancel", "role"].includes(intent)) {
		const userId = values.string("userId", "");
		try {
			const invitations = container.get(UserInvitations);
			if (intent === "resend") await invitations.resend(userId);
			if (intent === "cancel") await invitations.cancel(userId);
			if (intent === "role") {
				const role = values.string("role", "");
				if (role !== "user" && role !== "admin") return failure("Choose a valid role.");
				await container.get(UserAccess).setRole(userId, role);
			}
			return data({
				errors,
				values: { name: "", email: "" },
				message:
					intent === "role"
						? "Role updated."
						: intent === "cancel"
							? "Invitation canceled."
							: "Invitation sent.",
			});
		} catch (error) {
			if (error instanceof InvitationError || error instanceof UserRoleError || isAPIError(error))
				return failure(error.message);
			throw error;
		}
	}
	if (intent !== "create" && intent !== "invite") return failure("Unknown action.");
	const name = values.string("name");
	const email = values.string("email").toLowerCase();

	if (!name) errors.name = "A name is required.";
	if (!email) {
		errors.email = "An email address is required.";
	} else if (!EMAIL_ADDRESS.test(email)) {
		errors.email = "Enter a valid email address.";
	}

	if (Object.keys(errors).length > 0) {
		return data({ errors, values: { name, email }, message: "" }, { status: 400 });
	}

	try {
		if (intent === "invite") {
			await container.get(UserInvitations).invite(name, email);
			return data({ errors, values: { name: "", email: "" }, message: "Invitation sent." });
		}
		await container.get(UserManager).createRecordOnlyUser({ name, email });
	} catch (error) {
		if (error instanceof UserEmailAlreadyExistsError) {
			const duplicateErrors: typeof errors = {
				email: "This email address already belongs to a user.",
			};

			return data(
				{
					errors: duplicateErrors,
					values: { name, email },
					message: "",
				},
				{ status: 400 },
			);
		}

		if (error instanceof InvitationError || isAPIError(error)) return failure(error.message);
		throw error;
	}

	return redirect("/users", 303);
}

export default function Users({ actionData, loaderData }: Route.ComponentProps) {
	const navigation = useNavigation();
	const submitting = navigation.formAction?.endsWith("/users") && navigation.formData !== undefined;

	return (
		<>
			<Heading>Users</Heading>
			<Text className="mt-2 max-w-2xl">
				Users can be credited for laboratory work. A record-only user has no sign-in account and
				therefore cannot open Adacta.
			</Text>

			{actionData?.errors.form && (
				<p role="alert" className="mt-4 text-sm text-danger">
					{actionData.errors.form}
				</p>
			)}
			{actionData?.message && (
				<Text role="status" className="mt-4">
					{actionData.message}
				</Text>
			)}

			<div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
				<section aria-labelledby="users-heading">
					<Subheading id="users-heading">Users</Subheading>

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

								<div className="flex flex-wrap items-center gap-3">
									<Badge
										color={user.canSignIn ? "green" : "zinc"}
										className="self-start sm:self-auto"
									>
										{user.canSignIn
											? "Can sign in"
											: user.invitationExpiresAt
												? "Invited"
												: "Record only"}
									</Badge>
									{user.role === "admin" && <Badge color="blue">Admin</Badge>}
									{loaderData.isAdmin && <UserControls user={user} />}
								</div>
							</li>
						))}
					</ul>
				</section>

				<section
					aria-labelledby="add-user-heading"
					className="border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10"
				>
					{loaderData.isAdmin && <InviteUser />}
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

function UserControls({ user }: { user: Awaited<ReturnType<typeof loader>>["users"][number] }) {
	const fetcher = useFetcher<typeof action>();
	const busy = fetcher.state !== "idle";
	return (
		<div className="flex flex-wrap items-center gap-3">
			{!user.canSignIn && (
				<div>
					{user.invitationExpiresAt && (
						<Text className="mb-2 text-xs">
							Expires {new Date(user.invitationExpiresAt).toLocaleString()}
						</Text>
					)}
					<fetcher.Form method="post" className="flex gap-2">
						<input type="hidden" name="userId" value={user.id} />
						<Button outline type="submit" name="intent" value="resend" disabled={busy}>
							{user.invitationExpiresAt ? "Resend invitation" : "Invite"}
						</Button>
						{user.invitationExpiresAt && (
							<Button plain type="submit" name="intent" value="cancel" disabled={busy}>
								Cancel invitation
							</Button>
						)}
					</fetcher.Form>
				</div>
			)}
			{user.canSignIn && (
				<fetcher.Form method="post" className="flex items-center gap-2">
					<input type="hidden" name="intent" value="role" />
					<input type="hidden" name="userId" value={user.id} />
					<Select
						aria-label={`Role for ${user.name}`}
						name="role"
						defaultValue={user.role}
						key={user.role}
					>
						<option value="user">User</option>
						<option value="admin">Admin</option>
					</Select>
					<Button outline type="submit" disabled={busy} className="shrink-0 whitespace-nowrap">
						Save role
					</Button>
				</fetcher.Form>
			)}
			{fetcher.data?.errors.form && (
				<p role="alert" className="w-full text-sm text-danger">
					{fetcher.data.errors.form}
				</p>
			)}
			{fetcher.data?.message && (
				<Text role="status" className="w-full text-sm">
					{fetcher.data.message}
				</Text>
			)}
		</div>
	);
}

function InviteUser() {
	const fetcher = useFetcher<typeof action>();
	return (
		<section aria-labelledby="invite-user-heading" className="mb-10 border-b border-border pb-8">
			<Subheading id="invite-user-heading">Invite user</Subheading>
			<Text className="mt-1">
				Send a link to choose a password and open Adacta. An existing record-only identity will be
				reused.
			</Text>
			<fetcher.Form method="post" className="mt-6">
				<input type="hidden" name="intent" value="invite" />
				<Fieldset>
					<Field>
						<Label>Name</Label>
						<Input name="name" required autoComplete="name" />
						{fetcher.data?.errors.name && <ErrorMessage>{fetcher.data.errors.name}</ErrorMessage>}
					</Field>
					<Field className="mt-4">
						<Label>Email</Label>
						<Input name="email" type="email" required autoComplete="email" />
						{fetcher.data?.errors.email && <ErrorMessage>{fetcher.data.errors.email}</ErrorMessage>}
					</Field>
				</Fieldset>
				{fetcher.data?.errors.form && (
					<p role="alert" className="mt-4 text-sm text-danger">
						{fetcher.data.errors.form}
					</p>
				)}
				{fetcher.data?.message && (
					<Text role="status" className="mt-4">
						{fetcher.data.message}
					</Text>
				)}
				<Button type="submit" disabled={fetcher.state !== "idle"} className="mt-6">
					{fetcher.state !== "idle" ? "Sending…" : "Send invitation"}
				</Button>
			</fetcher.Form>
		</section>
	);
}
