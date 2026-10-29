import { createAuthClient } from "better-auth/react";
import { useState } from "react";
import { Link } from "react-router";

import { AuthLayout } from "~/catalyst-ui/auth-layout.tsx";
import { Button } from "~/catalyst-ui/button.tsx";
import { Field, Label } from "~/catalyst-ui/fieldset.tsx";
import { Heading } from "~/catalyst-ui/heading.tsx";
import { Input } from "~/catalyst-ui/input.tsx";
import { Text } from "~/catalyst-ui/text.tsx";

const authClient = createAuthClient();
export function meta() {
	return [{ title: "Forgot password — Adacta" }];
}

export default function ForgotPassword() {
	const [email, setEmail] = useState("");
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	const [error, setError] = useState("");
	async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			const result = await authClient.requestPasswordReset({ email });
			// Delivery failures also use the generic response to avoid identifying accounts.
			if (result.error?.status === 429) setError("Too many requests. Wait a minute and try again.");
			else setSent(true);
		} catch {
			setError("Unable to connect. Try again.");
		} finally {
			setBusy(false);
		}
	}
	return (
		<AuthLayout>
			<div className="w-full max-w-sm">
				<Heading>Forgot password</Heading>
				{sent ? (
					<Text role="status" className="mt-2">
						If this address has a sign-in account, a reset link will arrive shortly. If you have not
						activated your account, ask an administrator for an invitation.
					</Text>
				) : (
					<form onSubmit={submit}>
						<Text className="mt-2">Enter the email address you use to sign in to Adacta.</Text>
						<Field className="mt-8">
							<Label>Email</Label>
							<Input
								type="email"
								name="email"
								autoComplete="email"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
							/>
						</Field>
						{error && (
							<p role="alert" className="mt-4 text-sm text-danger">
								{error}
							</p>
						)}
						<Button type="submit" disabled={busy} className="mt-6 w-full">
							{busy ? "Sending…" : "Send reset link"}
						</Button>
					</form>
				)}
				<Text className="mt-6">
					<Link to="/login" className="text-accent underline">
						Back to sign in
					</Link>
				</Text>
			</div>
		</AuthLayout>
	);
}
