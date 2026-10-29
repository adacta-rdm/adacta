import { createAuthClient } from "better-auth/react";
import { useEffect, useState } from "react";
import { Link } from "react-router";

import { AuthLayout } from "~/catalyst-ui/auth-layout.tsx";
import { Button } from "~/catalyst-ui/button.tsx";
import { Field, Fieldset, Label } from "~/catalyst-ui/fieldset.tsx";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Input } from "~/catalyst-ui/input.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

const authClient = createAuthClient();

export function PasswordSetup({ setup, token }: { setup: boolean; token: string | null }) {
	const [password, setPassword] = useState("");
	const [confirmation, setConfirmation] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [done, setDone] = useState(false);
	const invalid = !token;

	useEffect(() => {
		// Keep the token out of the current browser history entry after loading.
		const url = new URL(window.location.href);
		url.searchParams.delete("token");
		window.history.replaceState(window.history.state, "", url);
	}, []);

	async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		if (password !== confirmation) {
			setError("Passwords do not match.");
			return;
		}
		setBusy(true);
		try {
			const result = await authClient.resetPassword({ token: token!, newPassword: password });
			if (result.error)
				setError(
					result.error.code === "INVALID_TOKEN"
						? "This link has expired or has already been used or canceled. Request a new link."
						: (result.error.message ?? "Your password could not be saved. Try again."),
				);
			else setDone(true);
		} catch {
			setError("Unable to connect. Try again.");
		} finally {
			setBusy(false);
		}
	}

	return (
		<AuthLayout>
			<div className="w-full max-w-sm">
				<Heading>
					{done ? "Your password is ready" : setup ? "Set up your account" : "Reset your password"}
				</Heading>
				{done ? (
					<>
						<Text className="mt-2">You can now sign in to Adacta with your new password.</Text>
						<Button href="/login" className="mt-6 w-full">
							Sign in
						</Button>
					</>
				) : invalid ? (
					<>
						<Text className="mt-2">This link is missing or no longer valid.</Text>
						<Text className="mt-4">
							{setup ? (
								"Ask an administrator to resend your invitation."
							) : (
								<Link to="/forgot-password" className="text-accent underline">
									Request a new password reset link
								</Link>
							)}
						</Text>
					</>
				) : (
					<form onSubmit={submit} className="mt-2">
						<Text>
							{setup
								? "Choose a password to open Adacta."
								: "Choose a new password for your Adacta account."}{" "}
							Use 8 to 128 characters.
						</Text>
						<Fieldset className="mt-8">
							<Field>
								<Label>Password</Label>
								<Input
									type="password"
									name="password"
									autoComplete="new-password"
									required
									minLength={8}
									maxLength={128}
									value={password}
									onChange={(event) => setPassword(event.target.value)}
								/>
							</Field>
							<Field className="mt-4">
								<Label>Confirm password</Label>
								<Input
									type="password"
									name="confirmation"
									autoComplete="new-password"
									required
									minLength={8}
									maxLength={128}
									value={confirmation}
									onChange={(event) => setConfirmation(event.target.value)}
								/>
							</Field>
						</Fieldset>
						{error && (
							<p role="alert" className="mt-4 text-sm text-danger">
								{error}
							</p>
						)}
						{error && (
							<Text className="mt-2">
								{setup ? (
									"If you need a new link, ask an administrator to resend your invitation."
								) : (
									<Link to="/forgot-password" className="text-accent underline">
										Request a new reset link
									</Link>
								)}
							</Text>
						)}
						<Button type="submit" disabled={busy} className="mt-6 w-full">
							{busy ? "Saving…" : "Save password"}
						</Button>
					</form>
				)}
				{!done && (
					<Text className="mt-6">
						<Link to="/login" className="text-accent underline">
							Back to sign in
						</Link>
					</Text>
				)}
			</div>
		</AuthLayout>
	);
}
